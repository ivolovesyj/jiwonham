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
          limit: 20,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data = response.data?.data || [];
      
      for (const job of data) {
        jobs.push({
          source: 'wanted',
          title: job.position,
          company: job.company?.name || '',
          link: `https://www.wanted.co.kr/wd/${job.id}`,
          career: '신입',
          location: job.address?.full_location || '',
          deadline: null, // 원티드는 상시채용이 많음
          crawledAt: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      console.error(`원티드 크롤링 오류 (${tagId}):`, error.message);
    }
  }
  
  // 중복 제거 (같은 공고가 여러 태그에 있을 수 있음)
  const uniqueJobs = jobs.filter((job, index, self) =>
    index === self.findIndex(j => j.link === job.link)
  );
  
  return uniqueJobs;
}
