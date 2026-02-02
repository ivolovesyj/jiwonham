/**
 * 직항 마케팅 신입/인턴 공고 크롤러
 * API: https://api.zighang.com/api/recruitments/v2
 */

import fs from 'fs';

const BASE_URL = 'https://api.zighang.com/api/recruitments/v2';

// 직무 카테고리
const JOB_CATEGORIES = {
  marketing: '마케팅_광고_홍보'
};

// 경력 필터
const CAREER_TYPES = {
  entry: '신입',
  intern: '인턴'
};

/**
 * 공고 목록 조회
 */
async function fetchJobs(page = 0, size = 20, options = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sortCondition: options.sort || 'CREATED_AT',
    orderCondition: 'DESC'
  });

  // 직무 카테고리 필터
  if (options.depthOnes) {
    params.append('depthOnes', options.depthOnes);
  }

  // 경력 필터 (신입, 인턴)
  if (options.careers) {
    options.careers.forEach(career => {
      params.append('careers', career);
    });
  }

  // 지역 필터
  if (options.regions) {
    options.regions.forEach(region => {
      params.append('regions', region);
    });
  }

  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const result = await response.json();

    if (!result.success) {
      console.error('API 오류:', result.message);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('요청 실패:', error.message);
    return null;
  }
}

/**
 * 마케팅 신입/인턴 공고 전체 크롤링
 */
async function crawlMarketingJobs(maxPages = 50) {
  console.log('📥 직항 마케팅 공고 크롤링 시작...\n');

  const allJobs = [];
  let page = 0;
  const size = 20;

  const options = {
    depthOnes: JOB_CATEGORIES.marketing,
    careers: [CAREER_TYPES.entry, CAREER_TYPES.intern],
    sort: 'ZIGHANG_SCORE'
  };

  while (page < maxPages) {
    console.log(`  페이지 ${page + 1} 조회 중...`);

    const data = await fetchJobs(page, size, options);

    if (!data || !data.content || data.content.length === 0) {
      console.log('  → 더 이상 공고 없음');
      break;
    }

    allJobs.push(...data.content);
    console.log(`  → ${data.content.length}개 추가 (총 ${allJobs.length}개)`);

    // 마지막 페이지면 종료
    if (data.last) {
      break;
    }

    page++;

    // Rate limiting (0.3초 대기)
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ 총 ${allJobs.length}개 공고 수집 완료`);

  // 데이터 정제
  const jobs = allJobs.map(job => ({
    id: job.id,
    company: job.company?.name,
    companyImage: job.company?.image,
    title: job.title,
    regions: job.regions || [],
    location: job.regions?.[0] || '',
    careerMin: job.careerMin,
    careerMax: job.careerMax,
    employeeTypes: job.employeeTypes || [],
    deadlineType: job.deadlineType,
    endDate: job.endDate,
    depthOnes: job.depthOnes || [],
    depthTwos: job.depthTwos || [],
    keywords: job.keywords || [],
    views: job.views,
    createdAt: job.createdAt,
    link: `https://zighang.com/recruitment/${job.id}`,
    source: 'zighang'
  }));

  return jobs;
}

/**
 * 서울 지역만 필터링
 */
function filterSeoulJobs(jobs) {
  return jobs.filter(job => {
    const location = job.location || job.regions?.join(' ') || '';
    return location.includes('서울');
  });
}

/**
 * 신입만 필터링 (경력 0~2년)
 */
function filterEntryLevel(jobs) {
  return jobs.filter(job => {
    return job.careerMin <= 2;
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  // 전체 크롤링
  const allJobs = await crawlMarketingJobs(100);

  // 저장
  const outputPath = 'C:/Users/Administrator/Desktop/채용공고/data/zighang_jobs.json';

  // data 폴더 없으면 생성
  const dataDir = 'C:/Users/Administrator/Desktop/채용공고/data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allJobs, null, 2), 'utf-8');
  console.log(`\n💾 저장 완료: ${outputPath}`);

  // 통계
  console.log('\n📊 크롤링 통계:');
  console.log(`   총 공고: ${allJobs.length}개`);

  // 지역별
  const regionStats = {};
  allJobs.forEach(job => {
    const region = job.location || '기타';
    regionStats[region] = (regionStats[region] || 0) + 1;
  });
  console.log('\n   [지역별 분포]');
  Object.entries(regionStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([region, count]) => {
      console.log(`   ${region}: ${count}개`);
    });

  // 세부 직무별
  const depthTwoStats = {};
  allJobs.forEach(job => {
    job.depthTwos?.forEach(dt => {
      depthTwoStats[dt] = (depthTwoStats[dt] || 0) + 1;
    });
  });
  console.log('\n   [세부 직무별 분포]');
  Object.entries(depthTwoStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([depth, count]) => {
      console.log(`   ${depth}: ${count}개`);
    });

  // 서울 신입만 필터
  const seoulJobs = filterSeoulJobs(allJobs);
  const entrySeoulJobs = filterEntryLevel(seoulJobs);
  console.log(`\n   서울 공고: ${seoulJobs.length}개`);
  console.log(`   서울 + 신입(0~2년): ${entrySeoulJobs.length}개`);

  return allJobs;
}

// ESM export
export {
  fetchJobs,
  crawlMarketingJobs,
  filterSeoulJobs,
  filterEntryLevel
};

// 실행
main().catch(console.error);
