import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function checkEmployeeTypes() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 모든 활성 공고에서 고용형태 추출
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('employee_types')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const employeeTypesSet = new Set();
  jobs.forEach(job => {
    if (job.employee_types) {
      job.employee_types.forEach(type => employeeTypesSet.add(type));
    }
  });

  console.log('현재 데이터베이스의 고용형태 값들:');
  console.log(Array.from(employeeTypesSet).sort());
  console.log(`\n총 ${employeeTypesSet.size}개 타입`);

  // contractor와 temporary가 있는지 확인
  if (employeeTypesSet.has('contractor')) {
    console.log('\n⚠️  "contractor" 발견됨 - 제거 필요');
  }
  if (employeeTypesSet.has('temporary')) {
    console.log('⚠️  "temporary" 발견됨 - 제거 필요');
  }
}

checkEmployeeTypes();
