import axios from 'axios';

/**
 * 카카오톡 "나에게 보내기" API로 메시지 전송
 *
 * 사용법:
 * 1. KAKAO_ACCESS_TOKEN 환경변수에 access_token 설정
 * 2. sendKakaoMessage(jobs) 호출
 *
 * 토큰 발급:
 * https://kauth.kakao.com/oauth/authorize?client_id=235e76202b347914b6ab82905e84e0e6&redirect_uri=http://localhost:3000/oauth&response_type=code&scope=talk_message
 */

const KAKAO_API_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

/**
 * 카카오톡 나에게 보내기
 */
export async function sendKakaoMessage(jobs, accessToken = null) {
  const token = accessToken || process.env.KAKAO_ACCESS_TOKEN;

  if (!token) {
    console.error('❌ KAKAO_ACCESS_TOKEN이 설정되지 않았습니다.');
    return false;
  }

  if (jobs.length === 0) {
    console.log('📭 전송할 공고가 없습니다.');
    return true;
  }

  // 메시지 포맷팅
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 상위 5개 공고만 표시 (카카오톡 글자수 제한)
  const topJobs = jobs.slice(0, 5);

  let description = '';
  topJobs.forEach((job, i) => {
    description += `${i + 1}. [${job.company}] ${job.title}\n`;
  });

  if (jobs.length > 5) {
    description += `\n... 외 ${jobs.length - 5}건`;
  }

  // 피드 템플릿 구조
  const templateObject = {
    object_type: 'feed',
    content: {
      title: `📢 ${today} 채용공고`,
      description: description.trim(),
      image_url: 'https://cdn-icons-png.flaticon.com/512/3281/3281289.png',
      link: {
        web_url: 'https://job-survey.vercel.app',
        mobile_web_url: 'https://job-survey.vercel.app'
      }
    },
    item_content: {
      profile_text: `오늘의 추천 공고 ${jobs.length}건`,
      items: topJobs.slice(0, 3).map(job => ({
        item: job.company,
        item_op: job.title.slice(0, 20) + (job.title.length > 20 ? '...' : '')
      }))
    },
    buttons: [
      {
        title: '공고 보러가기',
        link: {
          web_url: topJobs[0]?.link || 'https://job-survey.vercel.app',
          mobile_web_url: topJobs[0]?.link || 'https://job-survey.vercel.app'
        }
      }
    ]
  };

  try {
    const response = await axios.post(KAKAO_API_URL,
      `template_object=${encodeURIComponent(JSON.stringify(templateObject))}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    if (response.data.result_code === 0) {
      console.log('✅ 카카오톡 메시지 전송 완료');
      return true;
    } else {
      console.error('❌ 전송 실패:', response.data);
      return false;
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ 토큰이 만료되었습니다. 새로운 토큰을 발급받으세요.');
      console.error('   토큰 갱신 URL: https://kauth.kakao.com/oauth/authorize?client_id=235e76202b347914b6ab82905e84e0e6&redirect_uri=http://localhost:3000/oauth&response_type=code&scope=talk_message');
    } else {
      console.error('❌ 카카오톡 전송 오류:', error.message);
    }
    return false;
  }
}

/**
 * 텍스트 메시지로 보내기 (간단한 버전)
 */
export async function sendKakaoTextMessage(text, accessToken = null) {
  const token = accessToken || process.env.KAKAO_ACCESS_TOKEN;

  if (!token) {
    console.error('❌ KAKAO_ACCESS_TOKEN이 설정되지 않았습니다.');
    return false;
  }

  const templateObject = {
    object_type: 'text',
    text: text,
    link: {
      web_url: 'https://job-survey.vercel.app',
      mobile_web_url: 'https://job-survey.vercel.app'
    }
  };

  try {
    const response = await axios.post(KAKAO_API_URL,
      `template_object=${encodeURIComponent(JSON.stringify(templateObject))}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.result_code === 0) {
      console.log('✅ 텍스트 메시지 전송 완료');
      return true;
    }
    return false;

  } catch (error) {
    console.error('❌ 전송 오류:', error.message);
    return false;
  }
}

/**
 * 공고를 JSON 파일로도 저장 (취업 관리 웹사이트 연동용)
 */
export function formatJobsForWeb(jobs) {
  return jobs.map(job => ({
    ...job,
    id: `${job.source}-${Buffer.from(job.link).toString('base64').slice(0, 10)}`,
    status: 'new', // new, interested, applied, rejected
  }));
}

// 테스트용
if (process.argv[1].includes('kakao.js')) {
  const testJobs = [
    { company: '네이버', title: '브랜드 마케팅 담당자', link: 'https://example.com/1', source: 'wanted' },
    { company: '카카오', title: '마케팅 전략 기획', link: 'https://example.com/2', source: 'jobkorea' },
  ];

  console.log('🧪 카카오톡 메시지 테스트...');
  sendKakaoMessage(testJobs).then(result => {
    console.log(result ? '성공!' : '실패');
  });
}
