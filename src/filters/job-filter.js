/**
 * 채용공고 필터링 모듈
 * 여자친구 설문조사 결과를 바탕으로 공고를 점수화하고 필터링합니다.
 *
 * 핵심 선호도 (2026.01.26 설문 기준):
 * - 직무: 브랜드 마케팅, 마케팅 전략/기획, 광고/프로모션
 * - 회사: 대기업, 중견기업 (이름 들으면 아는 곳)
 * - 지역: 서울 전체 (판교 불가)
 * - 피하는 것: 콘텐츠 제작, 영상 편집, 디자인, 고객 응대, 데이터 분석
 * - 강점: 뷰티 도메인 지식
 */

// Supabase 설정
const SUPABASE_URL = 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE';

// 유명 기업 리스트 (이름 들으면 아는 곳)
const FAMOUS_COMPANIES = [
  // 대기업
  '삼성', 'LG', 'SK', '현대', '롯데', 'CJ', 'GS', '한화', '포스코', '신세계',
  // IT/플랫폼
  '네이버', '카카오', '쿠팡', '배달의민족', '배민', '우아한형제들', '토스', '당근', '야놀자', '무신사',
  '라인', 'LINE', '크래프톤', '넷마블', '엔씨소프트', 'NC', '스마일게이트', '넥슨',
  // 뷰티/패션
  '아모레퍼시픽', '아모레', 'LG생활건강', '올리브영', 'CJ올리브영', '에이블리', '지그재그', '무신사',
  '젠틀몬스터', '마뗑킴', '이니스프리', '설화수', '헤라', '미샤', '더페이스샵', '클리오', '에뛰드',
  // 이커머스/리테일
  '마켓컬리', '컬리', 'SSG', '11번가', '지마켓', '옥션', '위메프', '티몬', '오늘의집', '직방',
  // 식품/F&B
  'CJ제일제당', '오리온', '농심', '빙그레', '매일유업', '풀무원', '동원', '하이트진로', '오비맥주',
  // 금융
  '신한', '국민', 'KB', '하나', '우리', '케이뱅크', '카카오뱅크', '토스뱅크',
  // 기타 유명
  '현대카드', '삼성카드', '롯데카드', '쏘카', '타다', '야나두', '클래스101'
];

// 키워드 매핑
const KEYWORD_MAP = {
  // 선호 직무 (가산점)
  preferredJobs: {
    '브랜드 마케팅': ['브랜드', '브랜딩', 'brand', '브랜드 마케팅', 'BM'],
    '마케팅 전략/기획': ['전략', '기획', 'strategy', '마케팅 기획', 'GTM', 'PMM', '캠페인 기획'],
    '광고/프로모션': ['광고', '프로모션', '캠페인', 'campaign', 'ATL', 'BTL', 'IMC']
  },

  // 피해야 할 것 (감점) - 여자친구가 싫어하는 것들
  avoid: {
    '콘텐츠 직접 제작': ['콘텐츠 제작', '콘텐츠 기획 및 제작', '직접 제작', '카드뉴스 제작'],
    '영상 편집': ['영상 편집', '영상 제작', '촬영', '릴스', '숏폼', '숏츠', '프리미어', '에프터이펙트', '편집툴', '캡컷'],
    '디자인 작업': ['포토샵', 'photoshop', '일러스트', 'illustrator', '피그마', 'figma', '디자인 툴', '썸네일 제작'],
    '고객 응대': ['CS', '고객 응대', '고객센터', '상담', 'DM 응대', '댓글 관리', '인바운드', '아웃바운드'],
    '데이터 분석': ['SQL', '데이터 분석', '그로스', 'growth', 'GA', 'ROAS', 'CPA', '퍼포먼스', '매체 운영']
  },

  // 위치 필터 (판교 제외)
  excludeLocations: ['판교', '분당', '경기'],

  // 뷰티 업계 (가산점) - 도메인 지식 있음
  beautyIndustry: ['뷰티', '화장품', '코스메틱', 'cosmetic', '스킨케어', '메이크업', '향수', '올리브영', '아모레', 'LG생활건강']
};

/**
 * Supabase에서 최신 설문 응답 가져오기
 */
async function getLatestSurveyResponse() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/survey_responses?select=*&order=created_at.desc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const data = await response.json();
  return data[0] || null;
}

/**
 * 텍스트에서 키워드 포함 여부 확인
 */
function containsKeyword(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * 유명 기업인지 확인
 */
function isFamousCompany(companyName) {
  return FAMOUS_COMPANIES.some(famous =>
    companyName.includes(famous) || famous.includes(companyName)
  );
}

/**
 * 채용공고 점수 계산 (0-100점)
 */
function scoreJob(job, preferences) {
  let score = 50; // 기본 점수
  const reasons = [];
  const warnings = [];

  // 공고 전체 텍스트
  const jobText = `${job.company || ''} ${job.title || ''} ${job.info || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
  const companyName = job.company || '';
  const location = job.location || job.info || '';

  // ========== 1. 위치 필터 (판교 제외) ==========
  if (containsKeyword(location, KEYWORD_MAP.excludeLocations)) {
    score -= 50; // 판교/분당/경기는 큰 감점
    warnings.push('⚠️ 판교/경기 (출퇴근 어려움)');
  }

  // ========== 2. 유명 기업 가산점 ==========
  if (isFamousCompany(companyName)) {
    score += 20;
    reasons.push('⭐ 유명 기업');
  }

  // ========== 3. 선호 직무 매칭 ==========
  for (const [jobType, keywords] of Object.entries(KEYWORD_MAP.preferredJobs)) {
    if (containsKeyword(jobText, keywords)) {
      score += 15;
      reasons.push(`✓ ${jobType}`);
    }
  }

  // ========== 4. 피해야 할 것 (강력 감점) ==========
  for (const [avoidType, keywords] of Object.entries(KEYWORD_MAP.avoid)) {
    if (containsKeyword(jobText, keywords)) {
      score -= 25; // 강력 감점
      warnings.push(`✗ ${avoidType}`);
    }
  }

  // ========== 5. 뷰티 업계 가산점 ==========
  if (containsKeyword(jobText, KEYWORD_MAP.beautyIndustry)) {
    score += 10;
    reasons.push('💄 뷰티 업계 (도메인 지식 활용)');
  }

  // ========== 6. 신입 가능 여부 ==========
  if (jobText.includes('신입') || jobText.includes('경력무관') || jobText.includes('인턴')) {
    score += 5;
    reasons.push('✓ 신입/인턴 가능');
  }

  // ========== 7. 설문 기반 추가 선호도 ==========
  if (preferences) {
    // 회사 규모 선호도
    if (preferences.companySize?.includes('대기업') || preferences.companySize?.includes('중견기업')) {
      if (jobText.includes('대기업') || jobText.includes('중견') || isFamousCompany(companyName)) {
        score += 5;
      }
    }
  }

  // 점수 범위 제한 (0-100)
  score = Math.max(0, Math.min(100, score));

  // 통과 기준: 60점 이상 (경고가 2개 이상이면 탈락)
  const passed = score >= 60 && warnings.length < 2;

  return {
    score,
    reasons,
    warnings,
    passed
  };
}

/**
 * 채용공고 목록 필터링 및 정렬
 */
function filterAndSortJobs(jobs, preferences) {
  const scoredJobs = jobs.map(job => {
    const result = scoreJob(job, preferences);
    return {
      ...job,
      score: result.score,
      reasons: result.reasons,
      warnings: result.warnings,
      passed: result.passed
    };
  });

  // 통과한 공고만 필터링하고 점수순 정렬
  const passedJobs = scoredJobs
    .filter(job => job.passed)
    .sort((a, b) => b.score - a.score);

  // 탈락한 공고 (참고용)
  const rejectedJobs = scoredJobs
    .filter(job => !job.passed)
    .sort((a, b) => b.score - a.score);

  return {
    total: jobs.length,
    passed: passedJobs.length,
    rejected: rejectedJobs.length,
    jobs: passedJobs,
    rejectedSample: rejectedJobs.slice(0, 5) // 탈락 샘플 5개
  };
}

/**
 * 메인 필터링 함수
 */
async function filterJobs(jobs) {
  const surveyResponse = await getLatestSurveyResponse();

  if (!surveyResponse) {
    console.log('⚠️ 설문 응답이 없습니다.');
    return { total: jobs.length, passed: jobs.length, rejected: 0, jobs };
  }

  const preferences = surveyResponse.preferences;
  console.log('📋 설문 선호도:', JSON.stringify(preferences, null, 2));

  const result = filterAndSortJobs(jobs, preferences);

  console.log(`\n📊 필터링 결과: ${result.total}개 중 ${result.passed}개 통과 (${result.rejected}개 제외)`);

  return result;
}

/**
 * 학습된 가중치 가져오기 (job-learner.js와 동일 로직)
 */
async function getLearnedWeights() {
  try {
    const keywordRes = await fetch(
      `${SUPABASE_URL}/rest/v1/keyword_weights?order=weight.desc&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    const keywords = await keywordRes.json();

    const companyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/company_preference?order=score.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    const companies = await companyRes.json();

    return {
      keywords: Array.isArray(keywords) ? keywords : [],
      companies: Array.isArray(companies) ? companies : []
    };
  } catch (e) {
    return { keywords: [], companies: [] };
  }
}

/**
 * 학습 가중치를 적용한 점수 계산
 */
function applyLearnedWeights(job, weights) {
  let learnedScore = 0;
  const learnedReasons = [];

  if (!weights.keywords.length && !weights.companies.length) {
    return { score: 0, reasons: [] };
  }

  const jobText = `${job.company || ''} ${job.title || ''} ${job.info || ''} ${job.description || ''}`.toLowerCase();

  // 키워드 가중치 적용
  const keywordMap = new Map(weights.keywords.map(k => [k.keyword, k.weight]));

  for (const [keyword, weight] of keywordMap) {
    if (jobText.includes(keyword)) {
      const impact = Math.max(-5, Math.min(5, weight));
      learnedScore += impact;

      if (Math.abs(weight) >= 3) {
        if (weight > 0) {
          learnedReasons.push(`📈 "${keyword}" 학습됨`);
        } else {
          learnedReasons.push(`📉 "${keyword}" 비선호 학습`);
        }
      }
    }
  }

  // 회사 선호도 적용
  const companyPref = weights.companies.find(c =>
    job.company?.includes(c.company) || c.company?.includes(job.company)
  );

  if (companyPref && Math.abs(companyPref.score) >= 2) {
    const companyImpact = Math.max(-10, Math.min(10, companyPref.score));
    learnedScore += companyImpact;

    if (companyPref.score >= 2) {
      learnedReasons.push(`🏢 ${job.company} 학습된 선호 기업`);
    } else if (companyPref.score <= -2) {
      learnedReasons.push(`🏢 ${job.company} 학습된 비선호`);
    }
  }

  return { score: learnedScore, reasons: learnedReasons };
}

/**
 * 학습 포함 메인 필터링 함수
 */
async function filterJobsWithLearning(jobs) {
  const surveyResponse = await getLatestSurveyResponse();
  const learnedWeights = await getLearnedWeights();

  const hasLearning = learnedWeights.keywords.length > 0 || learnedWeights.companies.length > 0;

  if (hasLearning) {
    console.log(`🧠 학습 데이터: 키워드 ${learnedWeights.keywords.length}개, 회사 ${learnedWeights.companies.length}개`);
  }

  const preferences = surveyResponse?.preferences || {};

  const scoredJobs = jobs.map(job => {
    // 기본 점수 계산
    const baseResult = scoreJob(job, preferences);

    // 학습 점수 추가
    const learnedResult = applyLearnedWeights(job, learnedWeights);

    const finalScore = Math.max(0, Math.min(100, baseResult.score + learnedResult.score));
    const allReasons = [...baseResult.reasons, ...learnedResult.reasons];
    const allWarnings = baseResult.warnings;

    // 통과 기준: 60점 이상 + 경고 2개 미만
    const passed = finalScore >= 60 && allWarnings.length < 2;

    return {
      ...job,
      score: finalScore,
      baseScore: baseResult.score,
      learnedScore: learnedResult.score,
      reasons: allReasons,
      warnings: allWarnings,
      passed
    };
  });

  const passedJobs = scoredJobs.filter(j => j.passed).sort((a, b) => b.score - a.score);
  const rejectedJobs = scoredJobs.filter(j => !j.passed).sort((a, b) => b.score - a.score);

  console.log(`\n📊 필터링 결과: ${jobs.length}개 중 ${passedJobs.length}개 통과 (${rejectedJobs.length}개 제외)`);
  if (hasLearning) {
    console.log(`   (학습 데이터 반영됨)`);
  }

  return {
    total: jobs.length,
    passed: passedJobs.length,
    rejected: rejectedJobs.length,
    jobs: passedJobs,
    rejectedSample: rejectedJobs.slice(0, 5)
  };
}

// ESM export
export {
  filterJobs,
  filterJobsWithLearning,
  scoreJob,
  getLatestSurveyResponse,
  filterAndSortJobs,
  getLearnedWeights,
  FAMOUS_COMPANIES
};

// 테스트용 코드
if (process.argv[1].includes('job-filter.js')) {
  const testJobs = [
    // 통과해야 할 공고들
    { company: 'CJ제일제당', title: '브랜드 마케팅 신입', info: '서울 중구', link: '#1' },
    { company: 'LG생활건강', title: '마케팅 전략 기획', info: '서울', link: '#2' },
    { company: '올리브영', title: '브랜드 마케팅 담당자', info: '서울 강남', link: '#3' },
    { company: '마켓컬리', title: '마케팅 캠페인 기획자', info: '서울 송파', link: '#4' },
    { company: '직방', title: '브랜드 마케팅 전략', info: '서울 강남', link: '#5' },

    // 탈락해야 할 공고들
    { company: '네이버', title: '마케팅 인턴', info: '판교', link: '#6' },
    { company: '스타트업A', title: 'SNS 콘텐츠 제작 및 영상 편집', info: '서울', link: '#7' },
    { company: '스타트업B', title: '그로스 마케터 (SQL 필수)', info: '서울', link: '#8' },
    { company: '회사C', title: 'CS 상담 및 고객 응대', info: '서울', link: '#9' },
    { company: '당근', title: '퍼포먼스 마케터 (GA/ROAS)', info: '서초', link: '#10' }
  ];

  filterJobs(testJobs).then(result => {
    console.log('\n✅ 추천 공고:');
    result.jobs.forEach((job, i) => {
      console.log(`\n${i+1}. [${job.score}점] ${job.company} - ${job.title}`);
      console.log(`   장점: ${job.reasons.join(', ') || '없음'}`);
      if (job.warnings.length) console.log(`   주의: ${job.warnings.join(', ')}`);
    });

    if (result.rejectedSample.length) {
      console.log('\n❌ 탈락 공고 샘플:');
      result.rejectedSample.forEach((job, i) => {
        console.log(`\n${i+1}. [${job.score}점] ${job.company} - ${job.title}`);
        console.log(`   사유: ${job.warnings.join(', ') || '점수 미달'}`);
      });
    }
  });
}
