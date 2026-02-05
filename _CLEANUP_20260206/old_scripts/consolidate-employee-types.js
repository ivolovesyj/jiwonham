import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function consolidateEmployeeTypes() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 고용형태를 통합합니다...\n');

  // 현재 고용형태 목록 확인
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, employee_types')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // 현재 고용형태 종류 확인
  const typesSet = new Set();
  jobs.forEach(job => {
    if (job.employee_types) {
      job.employee_types.forEach(type => typesSet.add(type));
    }
  });

  console.log('📊 현재 고용형태 목록:');
  console.log(Array.from(typesSet).sort());
  console.log();

  let updatedCount = 0;
  const updates = [];

  jobs.forEach(job => {
    if (!job.employee_types || job.employee_types.length === 0) return;

    let hasChange = false;
    const newTypes = job.employee_types.map(type => {
      // 1. 계약직 관련 통합: '계약직', '계약직/일용직', '일용직' → '계약직', '일용직'
      if (type === '계약직/일용직') {
        hasChange = true;
        return ['계약직', '일용직'];
      }

      // 2. 인턴 관련 통합: '전환형 인턴', '체험형 인턴', '전환형인턴', '체험형인턴' → '인턴'
      if (type === '전환형 인턴' || type === '체험형 인턴' || type === '전환형인턴' || type === '체험형인턴') {
        hasChange = true;
        return '인턴';
      }

      return type;
    }).flat(); // flat()으로 배열 중첩 해제

    if (hasChange) {
      // 중복 제거
      const uniqueTypes = [...new Set(newTypes)];
      updates.push({
        id: job.id,
        employee_types: uniqueTypes
      });
      updatedCount++;
    }
  });

  console.log(`📊 변환 대상: ${updatedCount}개 공고`);

  if (updates.length === 0) {
    console.log('✅ 변환할 데이터가 없습니다.');
  } else {
    // 배치 업데이트
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ employee_types: update.employee_types })
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Error updating ${update.id}:`, updateError);
        }
      }

      console.log(`  ✓ ${Math.min(i + batchSize, updates.length)}/${updates.length} 완료`);
    }

    console.log(`\n✅ 완료! ${updatedCount}개 공고의 고용형태를 통합했습니다.`);
  }

  // 변환 결과 확인
  console.log('\n🔍 통합 후 고용형태 목록:');
  const { data: checkJobs } = await supabase
    .from('jobs')
    .select('employee_types')
    .eq('is_active', true);

  const finalTypesSet = new Set();
  checkJobs.forEach(job => {
    if (job.employee_types) {
      job.employee_types.forEach(type => finalTypesSet.add(type));
    }
  });

  const sortedTypes = Array.from(finalTypesSet).sort();
  console.log(sortedTypes);

  // 각 고용형태별 공고 수
  console.log('\n📈 고용형태별 공고 수:');
  sortedTypes.forEach(type => {
    const count = checkJobs.filter(job => job.employee_types?.includes(type)).length;
    console.log(`  ${type}: ${count}개`);
  });
}

consolidateEmployeeTypes();
