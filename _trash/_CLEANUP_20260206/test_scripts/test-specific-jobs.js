import { fetchJobDetail } from './src/crawlers/zighang-full.js';

/**
 * 특정 공고 URL 테스트
 */
async function testSpecificJobs() {
  console.log('🧪 특정 공고 테스트 시작\n');
  
  const testUrls = [
    'https://zighang.com/recruitment/b475d71e-6c4a-43f3-9b5f-e34b1986d5d4',
    'https://zighang.com/recruitment/48a31e41-f010-4ed1-83f1-2674ac8284b7',
    'https://zighang.com/recruitment/259b04df-6581-4f4a-b251-dc927422735d',
    'https://zighang.com/recruitment/aff390ba-4992-462d-8bbf-8807cf6a89eb',
    'https://zighang.com/recruitment/72c963ba-b040-4262-bd28-6485589e8bca',
    'https://zighang.com/recruitment/54b94dee-938d-48c8-9ea9-f4e740e2fb09',
  ];

  const results = {
    total: testUrls.length,
    success: 0,
    failed: 0,
    withEducation: 0,
    withCompanyType: 0,
    withCompanyDetail: 0,
    details: []
  };

  console.log('=' .repeat(80));
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    const id = url.split('/').pop();
    
    console.log(`\n[${i + 1}/${testUrls.length}] 크롤링 중: ${id}`);
    
    try {
      const entry = { id, url };
      const job = await fetchJobDetail(entry);
      
      if (job && !job._deleted) {
        results.success++;
        
        // 학력 정보 수집 확인
        if (job.education) {
          results.withEducation++;
        }
        
        // 회사 유형 수집 확인
        if (job.company_type && job.company_type !== '중소기업') {
          results.withCompanyType++;
        }
        
        // 회사 상세 정보 크롤링 확인
        if (job.company_id) {
          results.withCompanyDetail++;
        }
        
        const detail = {
          id: job.id,
          company: job.company,
          company_type: job.company_type,
          company_id: job.company_id,
          title: job.title,
          education: job.education,
          employee_types: job.employee_types,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          career_min: job.career_min,
          career_max: job.career_max,
        };
        
        results.details.push(detail);
        
        console.log(`✅ 성공: ${job.company} - ${job.title}`);
        console.log(`   회사 ID: ${job.company_id || '없음'}`);
        console.log(`   회사 유형: ${job.company_type || '없음'}`);
        console.log(`   학력: ${job.education || '없음'}`);
        console.log(`   고용형태: ${job.employee_types?.join(', ') || '없음'}`);
        console.log(`   경력: ${job.career_min ?? '미정'}~${job.career_max ?? '무관'}년`);
        console.log(`   직무 대분류: ${job.depth_ones?.join(', ') || '없음'}`);
        console.log(`   직무 소분류: ${job.depth_twos?.join(', ') || '없음'}`);
      } else if (job && job._deleted) {
        console.log(`⚠️  삭제된 공고`);
        results.failed++;
      } else {
        console.log(`❌ 크롤링 실패`);
        results.failed++;
      }
    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
      results.failed++;
    }
    
    // 딜레이
    if (i < testUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 테스트 결과 요약\n');
  console.log(`총 시도:        ${results.total}개`);
  console.log(`성공:           ${results.success}개 (${((results.success / results.total) * 100).toFixed(1)}%)`);
  console.log(`실패:           ${results.failed}개 (${((results.failed / results.total) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('📈 새 필드 수집 현황:');
  console.log(`학력 정보:      ${results.withEducation}개 (${results.success > 0 ? ((results.withEducation / results.success) * 100).toFixed(1) : 0}%)`);
  console.log(`회사 유형:      ${results.withCompanyType}개 (${results.success > 0 ? ((results.withCompanyType / results.success) * 100).toFixed(1) : 0}%)`);
  console.log(`  (기본값 제외한 실제 크롤링된 회사 유형)`);
  console.log(`회사 ID 존재:   ${results.withCompanyDetail}개 (${results.success > 0 ? ((results.withCompanyDetail / results.success) * 100).toFixed(1) : 0}%)`);
  
  console.log('\n📋 상세 결과:\n');
  results.details.forEach((detail, idx) => {
    console.log(`${idx + 1}. ${detail.company} - ${detail.title}`);
    console.log(`   ID: ${detail.id}`);
    console.log(`   회사 유형: ${detail.company_type || '정보없음'}`);
    console.log(`   학력: ${detail.education || '정보없음'}`);
    console.log(`   고용형태: ${detail.employee_types?.join(', ') || '정보없음'}`);
    console.log(`   경력: ${detail.career_min ?? '미정'}~${detail.career_max ?? '무관'}년`);
    console.log(`   직무 대분류: ${detail.depth_ones?.join(', ') || '정보없음'}`);
    console.log(`   직무 소분류: ${detail.depth_twos?.join(', ') || '정보없음'}`);
    console.log('');
  });
  
  console.log('✅ 테스트 완료!\n');
}

// 실행
testSpecificJobs();
