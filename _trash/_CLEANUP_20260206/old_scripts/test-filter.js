/**
 * 실제 직항 데이터로 필터 테스트
 */

import fs from 'fs';
import { filterJobsWithLearning, FAMOUS_COMPANIES } from '../src/filters/job-filter.js';

async function main() {
  // 크롤링한 데이터 로드
  const rawData = fs.readFileSync('C:/Users/Administrator/Desktop/채용공고/data/zighang_jobs.json', 'utf-8');
  const jobs = JSON.parse(rawData);

  console.log(`📂 로드된 공고: ${jobs.length}개\n`);

  // 직항 데이터 → 필터 형식으로 변환
  const convertedJobs = jobs.map(job => ({
    id: job.id,
    company: job.company,
    title: job.title,
    info: job.location,  // 지역
    location: job.location,
    industry: job.depthTwos?.[0] || '',  // 세부 직무
    description: `${job.depthTwos?.join(' ') || ''} ${job.keywords?.join(' ') || ''}`,
    link: job.link,
    source: 'zighang'
  }));

  // 필터링 실행
  const result = await filterJobsWithLearning(convertedJobs);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('✅ 추천 공고 TOP 20:');
  console.log('='.repeat(60));

  result.jobs.slice(0, 20).forEach((job, i) => {
    const famous = FAMOUS_COMPANIES.some(c => job.company?.includes(c)) ? '⭐' : '';
    console.log(`\n${i + 1}. [${job.score}점] ${famous}${job.company} - ${job.title}`);
    console.log(`   📍 ${job.location || '미정'}`);
    if (job.reasons?.length) {
      console.log(`   장점: ${job.reasons.slice(0, 3).join(', ')}`);
    }
    console.log(`   🔗 ${job.link}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('❌ 탈락 공고 샘플:');
  console.log('='.repeat(60));

  result.rejectedSample.forEach((job, i) => {
    console.log(`\n${i + 1}. [${job.score}점] ${job.company} - ${job.title}`);
    console.log(`   📍 ${job.location || '미정'}`);
    if (job.warnings?.length) {
      console.log(`   사유: ${job.warnings.join(', ')}`);
    }
  });

  // 요약 저장
  const summary = {
    total: result.total,
    passed: result.passed,
    rejected: result.rejected,
    topJobs: result.jobs.slice(0, 50).map(j => ({
      company: j.company,
      title: j.title,
      location: j.location,
      score: j.score,
      reasons: j.reasons,
      link: j.link
    }))
  };

  fs.writeFileSync(
    'C:/Users/Administrator/Desktop/채용공고/data/filtered_jobs.json',
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  console.log('\n💾 필터링 결과 저장: data/filtered_jobs.json');
}

main().catch(console.error);
