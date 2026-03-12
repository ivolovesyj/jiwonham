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
 * 재시도 헬퍼 (지수 백오프)
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.message?.includes('500') ||
                          error.message?.includes('502') ||
                          error.message?.includes('503') ||
                          error.message?.includes('504') ||
                          error.message?.includes('ECONNRESET');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`  ⚠️ 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 후)...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Supabase REST API로 upsert (재시도 포함)
 */
async function supabaseUpsert(table, rows) {
  return withRetry(async () => {
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
  });
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
    await withRetry(async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error(`PATCH 실패: ${res.status}`);
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
 * 크롤링 상태 저장
 */
async function saveCrawlState(state) {
  const fs = await import('fs/promises');
  await fs.writeFile('crawl-state.json', JSON.stringify(state, null, 2));
  console.log('💾 크롤링 상태 저장됨 (crawl-state.json)');
}

/**
 * 크롤링 상태 로드
 */
async function loadCrawlState() {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile('crawl-state.json', 'utf-8');
    const state = JSON.parse(data);
    console.log('📂 이전 크롤링 상태 로드됨');
    console.log(`   - 진행률: ${state.processed}/${state.total}개`);
    console.log(`   - 마지막 ID: ${state.lastProcessedId}`);
    return state;
  } catch {
    return null;
  }
}

/**
 * 메인 실행
 */
async function main() {
  const isFullCrawl = process.argv.includes('--full');
  const isResume = process.argv.includes('--resume');

  console.log('🐕 취업하개 - 채용공고 수집기');
  console.log(`시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`모드: ${isFullCrawl ? '전체 수집' : '증분 수집'}${isResume ? ' (재개)' : ''}\n`);

  // 증분 크롤링: 마지막 수집일 이후 수정된 공고만 상세 크롤링
  // (사이트맵 전체 URL은 항상 수집 → diff용)
  let sinceDate = null;
  if (!isFullCrawl) {
    sinceDate = await getLastCrawledAt();
    if (sinceDate) {
      console.log(`📅 마지막 수집: ${sinceDate}`);
    } else {
      console.log('📅 이전 수집 기록 없음 → 전체 수집 모드로 전환');
    }
  }

  // 재개 모드: 이전 상태 로드
  let resumeState = null;
  if (isResume) {
    resumeState = await loadCrawlState();
    if (!resumeState) {
      console.log('⚠️  이전 상태 파일이 없습니다. 처음부터 시작합니다.');
    }
  }

  // full 크롤링 시 이미 수집된 ID 조회 → 스킵 (중단 후 재개)
  let existingIds = null;
  if (isFullCrawl || isResume) {
    console.log('📦 DB에서 기존 공고 ID 조회...');
    existingIds = new Set();
    let offset = 0;
    const FETCH_BATCH = 1000;
    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/jobs?select=id&order=id&limit=${FETCH_BATCH}&offset=${offset}`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const rows = await res.json();
      if (!rows.length) break;
      for (const r of rows) existingIds.add(r.id);
      offset += FETCH_BATCH;
    }
    console.log(`  기존 공고: ${existingIds.size}건 → 이미 수집된 건 스킵`);
  }

  // 크롤링 실행 (sinceDate는 상세 크롤링 범위만 제한, 사이트맵은 항상 전체)
  let lastProcessedIndex = resumeState?.processed || 0;
  
  const result = await crawlAll({
    sinceDate,
    existingIds,
    resumeFrom: lastProcessedIndex,
    onBatch: saveBatch,
    onProgress: async ({ current, total, success, failed, lastProcessedId }) => {
      // 진행 상황 출력 (GitHub Actions 로그용)
      if (current % 100 === 0) {
        console.log(`📊 진행: ${current}/${total} (${((current/total)*100).toFixed(1)}%)`);
        
        // 주기적으로 상태 저장 (100개마다)
        await saveCrawlState({
          processed: current,
          total,
          success,
          failed,
          lastProcessedId,
          timestamp: new Date().toISOString(),
        });
      }
    },
  });

  // === 마감 처리 ===
  // 사이트맵 기준으로만 비활성화 (end_date 만료되어도 사이트맵에 있으면 유지)
  // → 마감일 연장 케이스 대응

  if (result.allSitemapIds && result.allSitemapIds.size > 0) {
    console.log('\n🔍 사이트맵 diff 비활성화 (사이트맵에 없는 공고만 비활성화)...');
    let diffOffset = 0;
    const DIFF_BATCH = 5000;
    let diffDeactivated = 0;
    let expiredInSitemap = 0;

    const today = new Date().toISOString().split('T')[0];

    // 1단계: 비활성화 대상 ID 수집
    const allToDeactivate = [];
    while (true) {
      const dbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/jobs?is_active=eq.true&select=id,end_date&order=id&limit=${DIFF_BATCH}&offset=${diffOffset}`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const dbJobs = await dbRes.json();
      if (!dbJobs.length) break;

      for (const j of dbJobs) {
        if (!result.allSitemapIds.has(j.id)) {
          allToDeactivate.push(j.id);
        } else if (j.end_date && j.end_date < today) {
          expiredInSitemap++;
        }
      }

      diffOffset += DIFF_BATCH;
      if (diffOffset % 10000 === 0) {
        console.log(`  📊 스캔 진행: ${diffOffset}건 확인...`);
      }
    }

    // 2단계: 배치 PATCH (100개씩 IN 쿼리)
    const PATCH_BATCH = 100;
    for (let i = 0; i < allToDeactivate.length; i += PATCH_BATCH) {
      const batch = allToDeactivate.slice(i, i + PATCH_BATCH);
      const ids = batch.map(id => `"${id}"`).join(',');
      await withRetry(async () => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=in.(${ids})`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: false }),
        });
        if (!res.ok) throw new Error(`PATCH 실패: ${res.status}`);
      });
      diffDeactivated += batch.length;
    }

    console.log(`  🗑️ 사이트맵에서 제거됨: ${diffDeactivated}건 비활성화`);
    if (expiredInSitemap > 0) {
      console.log(`  📅 end_date 지났지만 사이트맵에 있음: ${expiredInSitemap}건 (마감 연장 가능성 → 유지)`);
    }
  }

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
