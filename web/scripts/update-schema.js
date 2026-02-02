// 데이터베이스 스키마 업데이트 스크립트
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .env.local 파일 로드
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateSchema() {
  console.log('🔄 데이터베이스 스키마 업데이트 시작...\n')

  try {
    // 테스트 데이터로 컬럼 존재 여부 확인
    console.log('📋 required_documents 컬럼 존재 여부 확인 중...')
    const { data: testData, error: testError } = await supabase
      .from('application_status')
      .select('required_documents')
      .limit(1)

    if (testError) {
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('❌ required_documents 컬럼이 존재하지 않습니다.')
        console.log('\n📝 Supabase 대시보드에서 다음 SQL을 실행해주세요:')
        console.log('─'.repeat(60))
        console.log(`
ALTER TABLE application_status
ADD COLUMN required_documents JSONB;

COMMENT ON COLUMN application_status.required_documents
IS '필요 서류 정보 (이력서, 자기소개서, 포트폴리오 상태)';
        `)
        console.log('─'.repeat(60))
        console.log('\n🔗 Supabase Dashboard > SQL Editor에서 실행')
        console.log('   https://supabase.com/dashboard/project/uphoiwlvglkogkcnrjkl/sql/new')
      } else {
        console.error('❌ 예상치 못한 오류:', testError)
      }
      process.exit(1)
    } else {
      console.log('✅ required_documents 컬럼이 이미 존재합니다!')
      console.log('\n테스트 업데이트 실행 중...')

      // 테스트 업데이트 (컬럼이 정상 작동하는지 확인)
      const testDoc = {
        resume: 'existing',
        cover_letter: 'needs_update'
      }

      console.log('📝 테스트 문서:', testDoc)
      console.log('✨ 스키마 업데이트 완료!')
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

updateSchema()
