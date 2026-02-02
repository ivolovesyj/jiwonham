// 데이터 초기화 스크립트
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

async function resetData() {
  console.log('🔄 데이터 초기화 시작...\n')

  try {
    // 1. user_job_actions 삭제
    const { error: actionsError, count: actionsCount } = await supabase
      .from('user_job_actions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 레코드 삭제

    if (actionsError && actionsError.code !== 'PGRST116') {
      // PGRST116 = no rows found (에러 아님)
      console.error('❌ user_job_actions 삭제 실패:', actionsError)
    } else {
      console.log('✅ user_job_actions 삭제 완료')
    }

    // 2. application_status 삭제
    const { error: statusError } = await supabase
      .from('application_status')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (statusError && statusError.code !== 'PGRST116') {
      console.error('❌ application_status 삭제 실패:', statusError)
    } else {
      console.log('✅ application_status 삭제 완료')
    }

    // 3. saved_jobs 삭제
    const { error: jobsError } = await supabase
      .from('saved_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (jobsError && jobsError.code !== 'PGRST116') {
      console.error('❌ saved_jobs 삭제 실패:', jobsError)
    } else {
      console.log('✅ saved_jobs 삭제 완료')
    }

    console.log('\n✨ 데이터 초기화 완료!')
    console.log('💡 브라우저의 localStorage도 초기화하세요: 개발자도구 > Application > Local Storage > Clear')
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

resetData()
