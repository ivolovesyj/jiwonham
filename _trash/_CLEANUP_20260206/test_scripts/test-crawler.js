import { fetchSitemapIndex, fetchSitemapUrls, fetchJobDetail } from './src/crawlers/zighang-full.js';

/**
 * 크롤러 테스트: 50개 공고 샘플링
 */
async function testCrawler() {
  console.log('🧪 크롤러 테스트 시작 (50개 샘플)\n');
  
  try {
    // 1. Sitemap 가져오기
    console.log('📋 1단계: Sitemap 수집 중...');
    const sitemapUrls = await fetchSitemapIndex();
    
    if (sitemapUrls.length === 0) {
      console.error('❌ Sitemap을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`✅ ${sitemapUrls.length}개 sitemap 발견\n`);
    
    // 2. 첫 번째 sitemap에서 공고 목록 가져오기
    console.log('📋 2단계: 공고 목록 수집 중...');
    const firstSitemap = sitemapUrls[0];
    const entries = await fetchSitemapUrls(firstSitemap);
    
    console.log(`✅ ${entries.length}개 공고 발견\n`);
    
    // 3. 50개만 샘플링
    const sampleSize = Math.min(50, entries.length);
    const sampleEntries = entries.slice(0, sampleSize);
    
    console.log(`📋 3단계: ${sampleSize}개 공고 상세 정보 크롤링 중...\n`);
    console.log('=' .repeat(80));
    
    // 4. 상세 정보 크롤링 (동시 5개씩)
    const results = {
      total: sampleSize,
      success: 0,
      failed: 0,
      withEducation: 0,
      withCompanyType: 0,
      withCompanyDetail: 0,
      samples: []
    };
    
    const CONCURRENCY = 5;
    
    for (let i = 0; i < sampleEntries.length; i += CONCURRENCY) {
      const chunk = sampleEntries.slice(i, i + CONCURRENCY);
      const jobs = await Promise.all(chunk.map(entry => 
        fetchJobDetail(entry).catch(err => {
          console.error(`❌ 크롤링 실패 (${entry.id}):`, err.message);
          return null;
        })
      ));
      
      for (const job of jobs) {
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
          
          // 회사 상세 정보 크롤링 확인 (hasDetailInfo가 있었는지)
          if (job.company_id) {
            results.withCompanyDetail++;
          }
          
          // 처음 5개는 샘플로 저장
          if (results.samples.length < 5) {
            results.samples.push({
              id: job.id,
              company: job.company,
              company_type: job.company_type,
              title: job.title,
              education: job.education,
              employee_types: job.employee_types,
              depth_twos: job.depth_twos,
            });
          }
          
          console.log(`✅ [${results.success}/${sampleSize}] ${job.company} - ${job.title}`);
          console.log(`   └─ 회사유형: ${job.company_type || '없음'} | 학력: ${job.education || '없음'}`);
        } else if (job && job._deleted) {
          console.log(`⚠️  삭제된 공고: ${job.id}`);
        } else {
          results.failed++;
          console.log(`❌ 크롤링 실패`);
        }
      }
      
      // 딜레이
      if (i + CONCURRENCY < sampleEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log('=' .repeat(80));
    console.log('\n📊 테스트 결과 요약\n');
    console.log(`총 시도:        ${results.total}개`);
    console.log(`성공:           ${results.success}개 (${((results.success / results.total) * 100).toFixed(1)}%)`);
    console.log(`실패:           ${results.failed}개 (${((results.failed / results.total) * 100).toFixed(1)}%)`);
    console.log('');
    console.log('📈 새 필드 수집 현황:');
    console.log(`학력 정보:      ${results.withEducation}개 (${((results.withEducation / results.success) * 100).toFixed(1)}%)`);
    console.log(`회사 유형:      ${results.withCompanyType}개 (${((results.withCompanyType / results.success) * 100).toFixed(1)}%)`);
    console.log(`  (기본값 제외한 실제 크롤링된 회사 유형)`);
    console.log(`회사 상세 크롤링: ${results.withCompanyDetail}개 (${((results.withCompanyDetail / results.success) * 100).toFixed(1)}%)`);
    
    console.log('\n🔍 샘플 데이터 (처음 5개):\n');
    results.samples.forEach((sample, idx) => {
      console.log(`${idx + 1}. ${sample.company} - ${sample.title}`);
      console.log(`   ID: ${sample.id}`);
      console.log(`   회사 유형: ${sample.company_type || '정보없음'}`);
      console.log(`   학력: ${sample.education || '정보없음'}`);
      console.log(`   고용형태: ${sample.employee_types?.join(', ') || '정보없음'}`);
      console.log(`   직무: ${sample.depth_twos?.join(', ') || '정보없음'}`);
      console.log('');
    });
    
    console.log('✅ 테스트 완료!\n');
    
    // 검증 메시지
    if (results.withEducation === 0) {
      console.log('⚠️  주의: 학력 정보가 하나도 수집되지 않았습니다.');
      console.log('   - RSC에 education 필드가 없거나');
      console.log('   - 자격요건에서 학력 키워드를 찾지 못했을 수 있습니다.');
    }
    
    if (results.withCompanyType === 0) {
      console.log('⚠️  주의: 회사 유형이 모두 기본값입니다.');
      console.log('   - hasDetailInfo가 false이거나');
      console.log('   - 회사 페이지 크롤링이 실패했을 수 있습니다.');
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error);
    console.error(error.stack);
  }
}

// 실행
testCrawler();
