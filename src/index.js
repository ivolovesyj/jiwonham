import 'dotenv/config';
import { crawlAll, fetchAllJobUrls } from './crawlers/zighang-full.js';
import { sendKakaoMessage } from './kakao.js';

// Supabase 설정 (service_role key 사용 - RLS 우회)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  console.error('   Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

/**
 * Supabase REST API로 upsert
 */
async function supabaseUpsert(table, rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase upsert 실패 (${table}): ${response.status} ${error}`);
  }

  return response;
}

/**
 * Supabase에서 마지막 크롤링 시각 가져오기
 */
async function getLastCrawledAt() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/crawl_metadata?id=eq.default&select=last_crawled_at`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    return data[0]?.last_crawled_at || null;
  } catch {
    return null;
  }
}

/**
 * 크롤링 메타데이터 업데이트
 */
async function updateCrawlMetadata(stats) {
  await supabaseUpsert('crawl_metadata', [{
    id: 'default',
    last_crawled_at: new Date().toISOString(),
    last_sitemap_check: new Date().toISOString(),
    total_jobs: stats.total,
    active_jobs: stats.success,
    updated_at: new Date().toISOString(),
  }]);
}

/**
 * 배치 저장 콜백: Supabase jobs 테이블에 upsert
 */
async function saveBatch(batch) {
  // 삭제된 공고와 정상 공고 분리
  const activeJobs = batch.filter(j => j.is_active !== false && !j._deleted);
  const deletedIds = batch.filter(j => j.is_active === false || j._deleted).map(j => j.id);

  // 정상 공고 upsert
  if (activeJobs.length > 0) {
    await supabaseUpsert('jobs', activeJobs);
  }

  // 삭제된 공고 비활성화
  for (const id of deletedIds) {
    await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: false }),
    });
  }

  console.log(`  💾 저장: ${activeJobs.length}건 upsert, ${deletedIds.length}건 비활성화`);
}

/**
 * 새 공고 카카오톡 알림 (선택적)
 */
async function notifyNewJobs(newJobCount) {
  if (!process.env.KAKAO_ACCESS_TOKEN) return;
  if (newJobCount === 0) return;

  // 최근 저장된 공고 중 상위 5개 가져오기
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?is_active=eq.true&order=crawled_at.desc&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const recentJobs = await response.json();

    if (recentJobs.length > 0) {
      const formatted = recentJobs.map(j => ({
        company: j.company,
        title: j.title,
        link: `https://zighang.com/recruitment/${j.id}`,
        source: 'zighang',
      }));
      await sendKakaoMessage(formatted);
    }
  } catch (error) {
    console.error('카카오 알림 오류:', error.message);
  }
}

/**
 * 메인 실행
 */
async function main() {
  const isFullCrawl = process.argv.includes('--full');

  console.log('🐕 취업하개 - 채용공고 수집기');
  console.log(`시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`모드: ${isFullCrawl ? '전체 수집' : '증분 수집'}\n`);

  // 증분 크롤링: 마지막 수집일 이후만
  let sinceDate = null;
  if (!isFullCrawl) {
    sinceDate = await getLastCrawledAt();
    if (sinceDate) {
      console.log(`📅 마지막 수집: ${sinceDate}`);
    } else {
      console.log('📅 이전 수집 기록 없음 → 전체 수집 모드로 전환');
    }
  }

  // 크롤링 실행
  const result = await crawlAll({
    sinceDate,
    onBatch: saveBatch,
    onProgress: ({ current, total, success, failed }) => {
      // GitHub Actions 로그용
    },
  });

  // 메타데이터 업데이트
  await updateCrawlMetadata(result);

  // 카카오 알림
  await notifyNewJobs(result.success);

  console.log(`\n🎉 완료! 총 ${result.success}건 저장, ${result.failed}건 실패, ${result.deleted}건 삭제`);
}

main().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
