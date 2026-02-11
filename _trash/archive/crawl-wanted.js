/**
 * 원티드 마케팅 신입/인턴 공고 크롤러
 */

import fs from 'fs';

const MARKETING_CATEGORY = 523;
const BASE_URL = 'https://www.wanted.co.kr/api/v4/jobs';

// 마케팅 세부 태그
const MARKETING_TAGS = {
  710: '마케터',
  719: '마케팅 전략 기획자',
  1635: '콘텐츠 마케터',
  1030: '디지털 마케터',
  707: '브랜드 마케터',
  10138: '퍼포먼스 마케터',
  721: '소셜 마케터',
  717: '그로스 해커',
  763: '광고 기획자(AE)',
  714: 'PR 전문가',
  716: 'BTL 마케터'
};

async function fetchJobs(offset = 0, limit = 100) {
  // years=0: 신입, years=-1: 인턴
  const url = `${BASE_URL}?country=kr&category=marketing&years=0&years=-1&limit=${limit}&offset=${offset}&job_sort=job.latest_order`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  return response.json();
}

async function fetchJobDetail(jobId) {
  const url = `https://www.wanted.co.kr/api/v4/jobs/${jobId}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.json();
  } catch (e) {
    console.log(`상세 조회 실패: ${jobId}`);
    return null;
  }
}

async function crawlAllJobs() {
  console.log('📥 원티드 마케팅 공고 크롤링 시작...\n');

  let allJobs = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    console.log(`  페이지 ${offset/limit + 1} 조회 중...`);
    const result = await fetchJobs(offset, limit);

    if (!result.data || result.data.length === 0) {
      break;
    }

    allJobs = allJobs.concat(result.data);
    console.log(`  → ${result.data.length}개 추가 (총 ${allJobs.length}개)`);

    if (!result.links?.next) {
      break;
    }

    offset += limit;

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ 총 ${allJobs.length}개 공고 수집 완료`);

  // 데이터 정제
  const jobs = allJobs.map(job => ({
    id: job.id,
    company: job.company?.name,
    industry: job.company?.industry_name,
    title: job.position,
    location: job.address?.location,
    district: job.address?.district,
    experience_from: job.annual_from,
    experience_to: job.annual_to,
    tags: job.category_tags?.map(t => t.id) || [],
    link: `https://www.wanted.co.kr/wd/${job.id}`,
    source: 'wanted'
  }));

  // 저장
  const outputPath = 'C:/Users/Administrator/Desktop/채용공고/data/wanted_jobs.json';
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2), 'utf-8');
  console.log(`💾 저장 완료: ${outputPath}`);

  // 간단한 통계
  console.log('\n📊 간단 통계:');

  // 산업별
  const industries = {};
  jobs.forEach(j => {
    industries[j.industry] = (industries[j.industry] || 0) + 1;
  });
  console.log('\n[산업별 분포]');
  Object.entries(industries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ind, cnt]) => console.log(`  ${ind}: ${cnt}개`));

  // 지역별
  const locations = {};
  jobs.forEach(j => {
    locations[j.location] = (locations[j.location] || 0) + 1;
  });
  console.log('\n[지역별 분포]');
  Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .forEach(([loc, cnt]) => console.log(`  ${loc}: ${cnt}개`));

  return jobs;
}

// 상세 정보 크롤링 (자격요건, 우대사항 등)
async function crawlJobDetails(jobs, sampleSize = 50) {
  console.log(`\n📥 상세 정보 크롤링 (샘플 ${sampleSize}개)...\n`);

  const sampled = jobs.slice(0, sampleSize);
  const details = [];

  for (let i = 0; i < sampled.length; i++) {
    const job = sampled[i];
    console.log(`  [${i+1}/${sampleSize}] ${job.company} - ${job.title}`);

    const detail = await fetchJobDetail(job.id);
    if (detail?.job) {
      details.push({
        id: job.id,
        company: job.company,
        title: job.title,
        industry: job.industry,
        requirements: detail.job.detail?.requirements || '',
        main_tasks: detail.job.detail?.main_tasks || '',
        intro: detail.job.detail?.intro || '',
        benefits: detail.job.detail?.benefits || '',
        preferred_points: detail.job.detail?.preferred_points || ''
      });
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  const outputPath = 'C:/Users/Administrator/Desktop/채용공고/data/wanted_details.json';
  fs.writeFileSync(outputPath, JSON.stringify(details, null, 2), 'utf-8');
  console.log(`\n💾 상세 정보 저장: ${outputPath}`);

  return details;
}

// 실행
const jobs = await crawlAllJobs();

// 상세 정보도 크롤링할지?
if (process.argv.includes('--details')) {
  await crawlJobDetails(jobs, 100);
}
