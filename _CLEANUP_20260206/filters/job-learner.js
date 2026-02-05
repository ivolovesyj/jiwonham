/**
 * 피드백 학습 모듈
 * 좋아요/싫어요 데이터를 분석해서 필터 가중치를 조정합니다.
 */

// Supabase 설정
const SUPABASE_URL = 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE';

// 불용어 (학습에서 제외할 단어들)
const STOP_WORDS = new Set([
  '및', '등', '의', '을', '를', '이', '가', '에', '로', '으로', '와', '과', '도', '는', '은',
  '채용', '모집', '담당', '담당자', '신입', '경력', '정규직', '계약직', '인턴',
  '서울', '경기', '판교', '강남', '마포', '성수',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with'
]);

// 최소 단어 길이
const MIN_WORD_LENGTH = 2;

/**
 * 텍스트에서 키워드 추출
 */
function extractKeywords(text) {
  if (!text) return [];

  // 소문자 변환 및 특수문자 제거
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 단어 분리 및 필터링
  const words = cleaned.split(' ')
    .filter(word =>
      word.length >= MIN_WORD_LENGTH &&
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word)  // 숫자만 있는 건 제외
    );

  // 중복 제거
  return [...new Set(words)];
}

/**
 * 피드백 저장
 */
async function saveFeedback(job, feedback, reason = '') {
  const jobText = `${job.company} ${job.title} ${job.info || ''} ${job.description || ''}`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/job_feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      job_id: job.id || job.link,
      company: job.company,
      title: job.title,
      industry: job.industry || null,
      location: job.location || job.info || null,
      job_text: jobText,
      feedback: feedback,  // 'like' or 'dislike'
      reason: reason
    })
  });

  if (!response.ok) {
    console.error('피드백 저장 실패:', await response.text());
    return false;
  }

  // 피드백 저장 후 학습 실행
  await learnFromFeedback(job, feedback);

  console.log(`✅ 피드백 저장 완료: ${job.company} - ${feedback}`);
  return true;
}

/**
 * 피드백으로부터 학습
 */
async function learnFromFeedback(job, feedback) {
  const jobText = `${job.company} ${job.title} ${job.info || ''} ${job.description || ''}`;
  const keywords = extractKeywords(jobText);

  // 1. 키워드 가중치 업데이트
  for (const keyword of keywords) {
    await updateKeywordWeight(keyword, feedback);
  }

  // 2. 회사 선호도 업데이트
  if (job.company) {
    await updateCompanyPreference(job.company, feedback);
  }
}

/**
 * 키워드 가중치 업데이트
 */
async function updateKeywordWeight(keyword, feedback) {
  const delta = feedback === 'like' ? 1 : -1;
  const likeInc = feedback === 'like' ? 1 : 0;
  const dislikeInc = feedback === 'dislike' ? 1 : 0;

  // upsert 시도
  const response = await fetch(`${SUPABASE_URL}/rest/v1/keyword_weights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      keyword: keyword,
      weight: delta,
      like_count: likeInc,
      dislike_count: dislikeInc,
      updated_at: new Date().toISOString()
    })
  });

  // upsert가 안 되면 기존 값 가져와서 업데이트
  if (!response.ok) {
    // 기존 데이터 조회
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/keyword_weights?keyword=eq.${encodeURIComponent(keyword)}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    const existing = await getRes.json();

    if (existing.length > 0) {
      // 업데이트
      const current = existing[0];
      await fetch(
        `${SUPABASE_URL}/rest/v1/keyword_weights?keyword=eq.${encodeURIComponent(keyword)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            weight: current.weight + delta,
            like_count: current.like_count + likeInc,
            dislike_count: current.dislike_count + dislikeInc,
            updated_at: new Date().toISOString()
          })
        }
      );
    } else {
      // 새로 생성
      await fetch(`${SUPABASE_URL}/rest/v1/keyword_weights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          keyword: keyword,
          weight: delta,
          like_count: likeInc,
          dislike_count: dislikeInc
        })
      });
    }
  }
}

/**
 * 회사 선호도 업데이트
 */
async function updateCompanyPreference(company, feedback) {
  const delta = feedback === 'like' ? 2 : -2;  // 회사는 가중치 더 크게
  const likeInc = feedback === 'like' ? 1 : 0;
  const dislikeInc = feedback === 'dislike' ? 1 : 0;

  // 기존 데이터 조회
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/company_preference?company=eq.${encodeURIComponent(company)}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const existing = await getRes.json();

  if (existing.length > 0) {
    // 업데이트
    const current = existing[0];
    await fetch(
      `${SUPABASE_URL}/rest/v1/company_preference?company=eq.${encodeURIComponent(company)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          score: current.score + delta,
          like_count: current.like_count + likeInc,
          dislike_count: current.dislike_count + dislikeInc,
          updated_at: new Date().toISOString()
        })
      }
    );
  } else {
    // 새로 생성
    await fetch(`${SUPABASE_URL}/rest/v1/company_preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        company: company,
        score: delta,
        like_count: likeInc,
        dislike_count: dislikeInc
      })
    });
  }
}

/**
 * 학습된 가중치 가져오기
 */
async function getLearnedWeights() {
  // 키워드 가중치 (상위 100개)
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

  // 회사 선호도
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
    keywords: keywords || [],
    companies: companies || []
  };
}

/**
 * 학습된 가중치로 점수 계산
 */
async function calculateLearnedScore(job) {
  const weights = await getLearnedWeights();
  let learnedScore = 0;
  const learnedReasons = [];

  // 공고 텍스트에서 키워드 추출
  const jobText = `${job.company} ${job.title} ${job.info || ''} ${job.description || ''}`;
  const jobKeywords = extractKeywords(jobText);

  // 1. 키워드 가중치 적용
  const keywordMap = new Map(weights.keywords.map(k => [k.keyword, k.weight]));

  for (const keyword of jobKeywords) {
    const weight = keywordMap.get(keyword);
    if (weight) {
      // 가중치를 점수로 변환 (최대 ±5점씩)
      const scoreImpact = Math.max(-5, Math.min(5, weight));
      learnedScore += scoreImpact;

      if (Math.abs(weight) >= 3) {
        if (weight > 0) {
          learnedReasons.push(`📈 "${keyword}" 선호`);
        } else {
          learnedReasons.push(`📉 "${keyword}" 비선호`);
        }
      }
    }
  }

  // 2. 회사 선호도 적용
  const companyPref = weights.companies.find(c =>
    job.company?.includes(c.company) || c.company?.includes(job.company)
  );

  if (companyPref) {
    const companyImpact = Math.max(-10, Math.min(10, companyPref.score));
    learnedScore += companyImpact;

    if (companyPref.score >= 2) {
      learnedReasons.push(`🏢 ${job.company} 선호 기업`);
    } else if (companyPref.score <= -2) {
      learnedReasons.push(`🏢 ${job.company} 비선호 기업`);
    }
  }

  return {
    score: learnedScore,
    reasons: learnedReasons
  };
}

/**
 * 피드백 통계 조회
 */
async function getFeedbackStats() {
  const feedbackRes = await fetch(
    `${SUPABASE_URL}/rest/v1/job_feedback?select=feedback`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const feedbacks = await feedbackRes.json();

  const likes = feedbacks.filter(f => f.feedback === 'like').length;
  const dislikes = feedbacks.filter(f => f.feedback === 'dislike').length;

  const weights = await getLearnedWeights();

  // 상위/하위 키워드
  const topKeywords = weights.keywords.slice(0, 10);
  const bottomKeywords = weights.keywords.slice(-10).reverse();

  return {
    totalFeedback: feedbacks.length,
    likes,
    dislikes,
    topKeywords: topKeywords.map(k => `${k.keyword} (+${k.weight.toFixed(1)})`),
    bottomKeywords: bottomKeywords.filter(k => k.weight < 0).map(k => `${k.keyword} (${k.weight.toFixed(1)})`),
    preferredCompanies: weights.companies.filter(c => c.score > 0).slice(0, 5),
    avoidedCompanies: weights.companies.filter(c => c.score < 0).slice(0, 5)
  };
}

// ESM export
export {
  saveFeedback,
  learnFromFeedback,
  getLearnedWeights,
  calculateLearnedScore,
  getFeedbackStats,
  extractKeywords
};

// 테스트
if (process.argv[1].includes('job-learner.js')) {
  // 테스트 피드백 데이터
  const testJobs = [
    { company: 'CJ제일제당', title: '브랜드 마케팅 전략 기획', info: '서울' },
    { company: '스타트업A', title: 'SNS 콘텐츠 제작 영상 편집', info: '서울' }
  ];

  console.log('🧪 학습 시스템 테스트\n');

  // 키워드 추출 테스트
  console.log('1️⃣ 키워드 추출 테스트:');
  testJobs.forEach(job => {
    const text = `${job.company} ${job.title} ${job.info}`;
    console.log(`   "${text}"`);
    console.log(`   → ${extractKeywords(text).join(', ')}`);
  });

  // 통계 조회
  console.log('\n2️⃣ 현재 학습 상태:');
  getFeedbackStats().then(stats => {
    console.log(`   총 피드백: ${stats.totalFeedback}개 (좋아요 ${stats.likes}, 싫어요 ${stats.dislikes})`);
    if (stats.topKeywords.length) {
      console.log(`   선호 키워드: ${stats.topKeywords.join(', ')}`);
    }
    if (stats.bottomKeywords.length) {
      console.log(`   비선호 키워드: ${stats.bottomKeywords.join(', ')}`);
    }
  });
}
