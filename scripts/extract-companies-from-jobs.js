import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fetchCompanyDetail } from '../src/crawlers/zighang-companies.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function extractAndCrawlCompanies() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 jobs 테이블에서 고유한 회사 추출 중...\n');

  // 활성 공고에서 고유한 회사명 추출
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('company')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueCompanies = [...new Set(jobs.map(j => j.company))].filter(Boolean);

  console.log(`✅ ${uniqueCompanies.length}개 고유 회사 발견\n`);

  // 회사명으로 company UUID를 찾기 위해 샘플 공고 확인
  console.log('📊 회사 ID 매핑 생성 중...\n');

  const companyMap = new Map(); // company name -> { id, count }

  for (const companyName of uniqueCompanies) {
    // 해당 회사의 공고 하나 가져오기 (최신순)
    const { data: sampleJobs } = await supabase
      .from('jobs')
      .select('id, company')
      .eq('company', companyName)
      .eq('is_active', true)
      .limit(1);

    if (sampleJobs && sampleJobs.length > 0) {
      const count = jobs.filter(j => j.company === companyName).length;
      companyMap.set(companyName, {
        name: companyName,
        jobCount: count
      });
    }
  }

  console.log(`✅ ${companyMap.size}개 회사 매핑 완료\n`);

  // 상위 20개 회사만 테스트
  const topCompanies = Array.from(companyMap.values())
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, 20);

  console.log('🚀 상위 20개 회사 크롤링 시작...\n');

  const results = [];

  for (let i = 0; i < topCompanies.length; i++) {
    const company = topCompanies[i];
    console.log(`[${i + 1}/20] ${company.name} (공고 ${company.jobCount}개)`);

    // 회사 페이지 URL 추측: /company/{company-name-slug} 형태일 수 있음
    // 하지만 정확한 UUID를 모르므로 직접 검색 필요

    // 일단 테스트로 알려진 회사 ID 사용
    if (company.name === '네이버웹툰') {
      const detail = await fetchCompanyDetail('0f40c99e-93e5-4eec-aae8-8f4d2b152464');
      if (detail) {
        console.log(`  ✅ 기업 유형: ${detail.company_type}`);
        results.push(detail);
      }
    } else {
      console.log('  ⚠️  회사 UUID를 알 수 없음');
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n📊 결과: ${results.length}개 회사 정보 수집 완료`);

  if (results.length > 0) {
    console.log('\n수집된 기업 유형:');
    const typeCount = {};
    results.forEach(r => {
      typeCount[r.company_type] = (typeCount[r.company_type] || 0) + 1;
    });
    console.log(typeCount);
  }
}

extractAndCrawlCompanies();
