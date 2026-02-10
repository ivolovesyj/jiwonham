/**
 * 일회성 스크립트: 유명회사(company_type != '기타') 공고의 redirect_url 백필
 *
 * DB에서 redirect_url이 null이고 company_type이 '기타'가 아닌 active 공고만
 * 직행 페이지를 다시 크롤링해서 redirect_url + affiliate를 채워넣는다.
 *
 * 사용: node src/crawlers/backfill-redirect-url.js
 */

import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

const CONCURRENCY = 5;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * RSC flight data에서 recruitment 객체 추출 (zighang-full.js와 동일)
 */
function extractRecruitmentFromRsc(html) {
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    rscChunks.push(decoded);
  }
  const fullRsc = rscChunks.join('');

  const recruitStart = fullRsc.indexOf('"recruitment":{');
  if (recruitStart === -1) return null;

  const objStart = recruitStart + '"recruitment":'.length;
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < fullRsc.length; i++) {
    if (fullRsc[i] === '{') depth++;
    else if (fullRsc[i] === '}') {
      depth--;
      if (depth === 0) { objEnd = i + 1; break; }
    }
  }

  try {
    return JSON.parse(fullRsc.substring(objStart, objEnd));
  } catch {
    return null;
  }
}

/**
 * 공고 페이지에서 redirectUrl + affiliate만 추출
 */
async function fetchRedirectInfo(jobId) {
  try {
    const url = `${BASE_URL}/recruitment/${jobId}`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const recruitment = extractRecruitmentFromRsc(response.data);

    if (!recruitment) return null;

    return {
      redirect_url: recruitment.redirectUrl || null,
      affiliate: recruitment.affiliate || null,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { _deleted: true };
    }
    console.error(`  ✗ ${jobId}: ${error.message}`);
    return null;
  }
}

/**
 * Supabase PATCH 업데이트
 */
async function updateJob(jobId, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`PATCH 실패: ${response.status} ${await response.text()}`);
  }
}

/**
 * DB에서 대상 공고 ID 조회
 */
async function getTargetJobs() {
  const allJobs = [];
  let offset = 0;
  const BATCH = 1000;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?` +
      `is_active=eq.true&` +
      `redirect_url=is.null&` +
      `company_type=neq.기타&` +
      `company_type=not.is.null&` +
      `select=id,company,company_type&` +
      `order=company_type,company&` +
      `limit=${BATCH}&offset=${offset}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const rows = await response.json();
    if (!rows.length) break;
    allJobs.push(...rows);
    offset += BATCH;
  }

  return allJobs;
}

/**
 * 메인 실행
 */
async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }

  console.log('🔗 유명회사 redirect_url 백필 시작');
  console.log(`   시간: ${new Date().toLocaleString('ko-KR')}\n`);

  // 1. 대상 조회
  const jobs = await getTargetJobs();
  console.log(`📋 대상 공고: ${jobs.length}건`);

  if (jobs.length === 0) {
    console.log('✅ 백필 대상이 없습니다.');
    return;
  }

  // 기업 유형별 통계
  const typeCounts = {};
  for (const job of jobs) {
    typeCounts[job.company_type] = (typeCounts[job.company_type] || 0) + 1;
  }
  console.log('   유형별 분포:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`     ${type}: ${count}건`);
  }
  console.log('');

  // 2. 크롤링 + 업데이트
  let updated = 0;
  let hasRedirect = 0;
  let noRedirect = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(job => fetchRedirectInfo(job.id))
    );

    for (let j = 0; j < chunk.length; j++) {
      const result = results[j];
      const job = chunk[j];

      if (!result || result._deleted) {
        failed++;
        continue;
      }

      try {
        if (result.redirect_url) {
          await updateJob(job.id, {
            redirect_url: result.redirect_url,
            affiliate: result.affiliate,
          });
          hasRedirect++;
        } else {
          // redirect_url이 없는 경우 빈 문자열로 표시 (null과 구분)
          await updateJob(job.id, {
            redirect_url: '',
            affiliate: result.affiliate,
          });
          noRedirect++;
        }
        updated++;
      } catch (error) {
        console.error(`  ✗ 업데이트 실패 ${job.id}: ${error.message}`);
        failed++;
      }
    }

    // 진행 상태 출력
    const processed = i + chunk.length;
    if (processed % 50 < CONCURRENCY || processed >= jobs.length) {
      const pct = ((processed / jobs.length) * 100).toFixed(1);
      console.log(`  📈 [${processed}/${jobs.length}] ${pct}% | 원문있음: ${hasRedirect}, 없음: ${noRedirect}, 실패: ${failed}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n✅ 백필 완료!`);
  console.log(`   총 처리: ${updated}건`);
  console.log(`   원문 링크 있음: ${hasRedirect}건`);
  console.log(`   원문 링크 없음: ${noRedirect}건 (직행 자체 공고)`);
  console.log(`   실패: ${failed}건`);
}

main().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
