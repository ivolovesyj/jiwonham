import axios from 'axios';

const API_URL = 'https://www.wanted.co.kr/api/v4/jobs';

// 마케팅 관련 태그 ID
const MARKETING_TAG_IDS = [
  518,  // 마케팅
  10111, // 디지털마케팅
  10112, // 콘텐츠마케팅
  10113, // 퍼포먼스마케팅
  10114, // 브랜드마케팅
  10115, // 광고기획
];

/**
 * 공고 상세 정보 가져오기
 */
async function getJobDetail(jobId) {
  try {
    const response = await axios.get(`${API_URL}/${jobId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 5000,
    });

    const job = response.data?.job;
    if (!job) return null;

    return {
      intro: job.detail?.intro || '',
      main_tasks: job.detail?.main_tasks || '',
      requirements: job.detail?.requirements || '',
      preferred_points: job.detail?.preferred_points || '',
      benefits: job.detail?.benefits || '',
    };
  } catch (error) {
    console.error(`  상세 정보 오류 (${jobId}):`, error.message);
    return null;
  }
}

export async function crawlWanted() {
  const jobs = [];
  
  for (const tagId of MARKETING_TAG_IDS) {
    try {
      const response = await axios.get(API_URL, {
        params: {
          country: 'kr',
          tag_type_ids: tagId,
          job_sort: 'job.latest_order',
          years: 0, // 신입
          locations: 'all',
          limit: 10, // 상세 정보 수집하므로 개수 줄임
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data = response.data?.data || [];
      
      for (const job of data) {
        console.log(`  - ${job.company?.name}: ${job.position}`);
        
        // 기본 정보
        const jobData = {
          source: 'wanted',
          title: job.position,
          company: job.company?.name || '',
          link: `https://www.wanted.co.kr/wd/${job.id}`,
          jobId: job.id,
          career: '신입',
          location: job.address?.full_location || '',
          deadline: job.due_time || null, // 마감일 (YYYY-MM-DD)
          crawledAt: new Date().toISOString(),
        };

        // 상세 정보 수집
        const detail = await getJobDetail(job.id);
        if (detail) {
          jobData.detail = detail;
        }

        jobs.push(jobData);

        // API 부하 방지 (0.3초 대기)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
    } catch (error) {
      console.error(`원티드 크롤링 오류 (${tagId}):`, error.message);
    }
  }
  
  // 중복 제거
  const uniqueJobs = jobs.filter((job, index, self) =>
    index === self.findIndex(j => j.link === job.link)
  );
  
  return uniqueJobs;
}
