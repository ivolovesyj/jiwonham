/**
 * 중복 공고 제거 모듈
 * 이미 보낸 공고를 추적하고 중복을 방지합니다.
 */

import crypto from 'crypto';

// Supabase 설정
const SUPABASE_URL = 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE';

/**
 * 공고의 고유 ID 생성
 * 회사명 + 제목 조합의 해시값 사용
 */
function generateJobId(job) {
  const uniqueString = `${job.company}|${job.title}`.toLowerCase().trim();
  return crypto.createHash('md5').update(uniqueString).digest('hex');
}

/**
 * 이미 보낸 공고 ID 목록 가져오기 (최근 30일)
 */
async function getSentJobIds() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sent_jobs?select=job_id&sent_at=gte.${thirtyDaysAgo.toISOString()}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  if (!response.ok) {
    console.error('❌ sent_jobs 조회 실패:', await response.text());
    return new Set();
  }

  const data = await response.json();
  return new Set(data.map(row => row.job_id));
}

/**
 * 보낸 공고 저장
 */
async function markJobsAsSent(jobs, source = 'unknown') {
  const records = jobs.map(job => ({
    job_id: generateJobId(job),
    company: job.company,
    title: job.title,
    link: job.link || null,
    source: source
  }));

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sent_jobs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=ignore-duplicates'  // 중복 무시
      },
      body: JSON.stringify(records)
    }
  );

  if (!response.ok) {
    console.error('❌ sent_jobs 저장 실패:', await response.text());
    return false;
  }

  console.log(`✅ ${records.length}개 공고 저장 완료`);
  return true;
}

/**
 * 중복 공고 제거
 */
async function removeDuplicates(jobs) {
  const sentJobIds = await getSentJobIds();
  console.log(`📦 이미 보낸 공고: ${sentJobIds.size}개`);

  const newJobs = [];
  const duplicates = [];

  for (const job of jobs) {
    const jobId = generateJobId(job);
    if (sentJobIds.has(jobId)) {
      duplicates.push(job);
    } else {
      newJobs.push({ ...job, _jobId: jobId });
    }
  }

  console.log(`🆕 새 공고: ${newJobs.length}개`);
  console.log(`🔄 중복 공고: ${duplicates.length}개`);

  return {
    newJobs,
    duplicates,
    stats: {
      total: jobs.length,
      new: newJobs.length,
      duplicate: duplicates.length
    }
  };
}

/**
 * 전체 파이프라인: 중복 제거 + 필터링 + 저장
 */
async function processJobs(jobs, source = 'unknown') {
  // 1. 중복 제거
  const { newJobs, stats } = await removeDuplicates(jobs);

  if (newJobs.length === 0) {
    console.log('📭 새로운 공고가 없습니다.');
    return {
      ...stats,
      filtered: 0,
      final: []
    };
  }

  // 2. 필터링 (job-filter.js와 연동)
  // 여기서는 필터링된 공고만 반환
  // 실제로는 filterJobs를 import해서 사용

  return {
    ...stats,
    jobs: newJobs
  };
}

// ESM export
export {
  generateJobId,
  getSentJobIds,
  markJobsAsSent,
  removeDuplicates,
  processJobs
};

// 테스트용 코드
if (process.argv[1].includes('job-dedup.js')) {
  const testJobs = [
    { company: '네이버', title: '마케팅 담당자', link: 'https://example.com/1' },
    { company: '카카오', title: '브랜드 매니저', link: 'https://example.com/2' },
    { company: '네이버', title: '마케팅 담당자', link: 'https://example.com/3' }, // 중복
  ];

  console.log('🔍 테스트 시작...\n');

  // ID 생성 테스트
  console.log('1️⃣ Job ID 생성 테스트:');
  testJobs.forEach(job => {
    console.log(`   ${job.company} - ${job.title}`);
    console.log(`   → ${generateJobId(job)}`);
  });

  console.log('\n2️⃣ 중복 제거 테스트:');
  removeDuplicates(testJobs).then(result => {
    console.log(`   총 ${result.stats.total}개 → 새 공고 ${result.stats.new}개, 중복 ${result.stats.duplicate}개`);
  });
}
