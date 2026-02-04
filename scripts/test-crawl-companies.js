import { crawlAllCompanies, fetchCompanyList, fetchCompanyDetail } from '../src/crawlers/zighang-companies.js';

async function test() {
  console.log('🧪 기업 크롤러 테스트\n');

  // 1. 기업 리스트 테스트
  console.log('1단계: 기업 리스트 가져오기');
  const companies = await fetchCompanyList();
  console.log(`   결과: ${companies.length}개 기업\n`);

  if (companies.length === 0) {
    console.log('❌ 기업 리스트를 가져올 수 없습니다.');
    return;
  }

  // 2. 상세 정보 테스트 (처음 3개만)
  console.log('2단계: 상세 정보 크롤링 테스트 (샘플 3개)\n');

  for (let i = 0; i < Math.min(3, companies.length); i++) {
    const company = companies[i];
    console.log(`[${i + 1}/${Math.min(3, companies.length)}] ${company.name || company.id}`);

    const detail = await fetchCompanyDetail(company.id);

    if (detail) {
      console.log('  ✅ 성공!');
      console.log('  회사명:', detail.name);
      console.log('  기업 유형:', detail.company_type);
      console.log('  설명:', detail.description.substring(0, 100) + '...');
    } else {
      console.log('  ❌ 실패');
    }
    console.log('');

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ 테스트 완료!');
  console.log(`\n전체 크롤링 예상 소요 시간: ${Math.ceil(companies.length * 0.5 / 60)}분`);
}

test();
