import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function migrateEmployeeTypes() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 CONTRACTOR와 TEMPORARY를 변환합니다...\n');

  // 모든 활성 공고 가져오기
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, employee_types')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  let updatedCount = 0;
  const updates = [];

  jobs.forEach(job => {
    if (!job.employee_types || job.employee_types.length === 0) return;

    let hasChange = false;
    const newTypes = job.employee_types.map(type => {
      if (type === 'CONTRACTOR' || type === 'contractor') {
        hasChange = true;
        return '프리랜서';
      }
      if (type === 'TEMPORARY' || type === 'temporary') {
        hasChange = true;
        return '계약직/일용직';
      }
      return type;
    });

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
    return;
  }

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

  console.log(`\n✅ 완료! ${updatedCount}개 공고의 고용형태를 변환했습니다.`);

  // 변환 결과 확인
  console.log('\n🔍 변환 후 고용형태 목록:');
  const { data: checkJobs } = await supabase
    .from('jobs')
    .select('employee_types')
    .eq('is_active', true);

  const typesSet = new Set();
  checkJobs.forEach(job => {
    if (job.employee_types) {
      job.employee_types.forEach(type => typesSet.add(type));
    }
  });

  console.log(Array.from(typesSet).sort());
}

migrateEmployeeTypes();
