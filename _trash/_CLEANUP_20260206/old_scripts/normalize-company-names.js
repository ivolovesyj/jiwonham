import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * 회사명 정규화 함수
 * "(주)", "주식회사", "유한회사" 등 제거하고 공백 정리
 */
function normalizeCompanyName(name) {
  if (!name) return '';

  return name
    .replace(/\(주\)/g, '')           // (주) 제거
    .replace(/\(유\)/g, '')           // (유) 제거
    .replace(/㈜/g, '')                // ㈜ 제거
    .replace(/주식회사/g, '')         // 주식회사 제거
    .replace(/유한회사/g, '')         // 유한회사 제거
    .replace(/유한책임회사/g, '')     // 유한책임회사 제거
    .replace(/\s+/g, '')              // 모든 공백 제거
    .toLowerCase()                    // 소문자로 변환
    .trim();
}

async function testNormalization() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 회사명 정규화 테스트\n');

  // 매칭 안 된 상위 회사들
  const unmatchedCompanies = [
    '베스트네트워크',
    '(주)베스로씨에스',
    '(주) 맥서브 (Maxerve Co., Ltd)',
    '베스트네트워크(주)',
    'RGA재보험',
    '닥터오 심리상담센터',
  ];

  console.log('📊 정규화 결과:\n');

  unmatchedCompanies.forEach(company => {
    const normalized = normalizeCompanyName(company);
    console.log(`"${company}"`);
    console.log(`  → "${normalized}"\n`);
  });

  // companies 테이블에서 유사한 이름 찾기
  console.log('\n🔎 companies 테이블에서 매칭 시도...\n');

  const { data: companies } = await supabase
    .from('companies')
    .select('name, company_type');

  // 정규화된 이름으로 매핑 생성
  const normalizedMap = new Map();
  companies?.forEach(c => {
    const normalized = normalizeCompanyName(c.name);
    normalizedMap.set(normalized, c);
  });

  unmatchedCompanies.forEach(jobCompany => {
    const normalized = normalizeCompanyName(jobCompany);
    const match = normalizedMap.get(normalized);

    console.log(`"${jobCompany}"`);
    if (match) {
      console.log(`  ✅ 매칭 성공: "${match.name}" (${match.company_type})`);
    } else {
      console.log(`  ❌ 매칭 실패`);
    }
    console.log('');
  });

  // 전체 매칭률 계산
  console.log('\n📈 전체 매칭률 계산 중...\n');

  const { data: jobs } = await supabase
    .from('jobs')
    .select('company')
    .eq('is_active', true);

  let matchedCount = 0;
  let totalCount = jobs?.length || 0;

  jobs?.forEach(job => {
    const normalized = normalizeCompanyName(job.company);
    if (normalizedMap.has(normalized)) {
      matchedCount++;
    }
  });

  const matchRate = ((matchedCount / totalCount) * 100).toFixed(1);

  console.log(`총 공고: ${totalCount}개`);
  console.log(`매칭 성공: ${matchedCount}개`);
  console.log(`매칭 실패: ${totalCount - matchedCount}개`);
  console.log(`매칭률: ${matchRate}%`);
}

testNormalization();
