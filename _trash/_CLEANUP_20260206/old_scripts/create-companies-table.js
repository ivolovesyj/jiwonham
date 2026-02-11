import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function createCompaniesTable() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔨 companies 테이블 생성 중...\n');

  // 테이블 존재 여부 확인
  const { data: existing, error: checkError } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ companies 테이블이 이미 존재합니다.');
    console.log('   기존 데이터를 유지하고 import를 진행합니다.\n');
    return;
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.error('❌ 테이블 확인 오류:', checkError);
    return;
  }

  console.log('⚠️  companies 테이블이 존재하지 않습니다.');
  console.log('   Supabase 대시보드에서 다음 SQL을 실행하세요:\n');

  const sql = `
-- ============================================
-- 기업 정보 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  company_type TEXT,
  description TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);

-- RLS 정책
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update companies"
  ON public.companies FOR UPDATE
  USING (auth.role() = 'service_role');
`;

  console.log(sql);
  console.log('\n==============================================');
  console.log('SQL 실행 후 다시 import 스크립트를 실행하세요.');
  console.log('==============================================\n');
}

createCompaniesTable();
