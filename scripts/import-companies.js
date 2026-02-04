import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function importCompanies() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📥 CSV 파일 읽기...\n');

  const csvPath = path.join(process.cwd(), 'company_list_20260204_1645.csv');
  // BOM 제거
  const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\ufeff/, '');

  const lines = csvContent.split('\n').filter(line => line.trim());
  const rows = lines.slice(1); // 헤더 제외

  console.log(`📊 총 ${rows.length}개 기업 발견\n`);

  const companies = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split(',');

    if (parts.length < 4) {
      if (i < 3) console.log(`  [디버그] 라인 ${i + 2} 스킵 (컬럼 부족): ${row.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    const corporate_name = parts[0].trim();
    const industry = parts[1].trim();
    const source_url = parts[2].trim();
    const crawled_at = parts.slice(3).join(',').trim(); // 타임스탬프에 콤마가 있을 수 있음

    // URL에서 company ID 추출
    const urlMatch = source_url.match(/\/company\/([a-f0-9-]+)$/);
    if (!urlMatch) {
      if (i < 3) console.log(`  [디버그] 라인 ${i + 2} URL 파싱 실패: ${source_url}`);
      skipped++;
      continue;
    }

    const companyId = urlMatch[1];

    companies.push({
      name: corporate_name,  // PRIMARY KEY로 사용
      zighang_id: companyId,  // 직항 URL ID (참고용)
      company_type: industry,
      description: null,
      image: null,
      crawled_at: new Date(crawled_at).toISOString(),
    });

    // 처음 3개 성공 샘플 출력
    if (companies.length <= 3) {
      console.log(`  [샘플 ${companies.length}] ${corporate_name} - ${industry} (ID: ${companyId.substring(0, 8)}...)`);
    }
  }

  console.log(`✅ ${companies.length}개 기업 파싱 완료 (스킵: ${skipped}개)\n`);

  // 기업 유형별 통계
  const typeCount = {};
  companies.forEach(c => {
    typeCount[c.company_type] = (typeCount[c.company_type] || 0) + 1;
  });

  console.log('📊 기업 유형별 통계:');
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}개`);
    });

  console.log('\n💾 데이터베이스에 저장 중...\n');

  // 배치 크기 50으로 upsert
  const batchSize = 50;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('companies')
      .upsert(batch, {
        onConflict: 'name',  // 회사명 기준으로 upsert
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 오류:`, error);
    } else {
      inserted += batch.length;
      console.log(`  ✓ ${Math.min(i + batchSize, companies.length)}/${companies.length} 완료`);
    }
  }

  console.log(`\n✅ 완료!`);
  console.log(`   저장: ${inserted}개`);

  // 검증
  console.log('\n🔍 저장 결과 검증...\n');

  const { count, error: countError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`✅ companies 테이블: 총 ${count}개 레코드`);
  }

  // 각 타입별 개수 확인
  const { data: typeData } = await supabase
    .from('companies')
    .select('company_type');

  if (typeData) {
    const dbTypeCount = {};
    typeData.forEach(c => {
      dbTypeCount[c.company_type] = (dbTypeCount[c.company_type] || 0) + 1;
    });

    console.log('\n📊 DB 내 기업 유형별 통계:');
    Object.entries(dbTypeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}개`);
      });
  }
}

importCompanies();
