import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';

export async function crawlZighang() {
  const jobs = [];
  
  try {
    // 마케팅 관련 검색
    const searchTerms = ['마케팅', '마케터', '광고', '브랜드'];
    
    for (const term of searchTerms) {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(term)}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);

      // 직항 페이지 구조에 맞게 파싱 (Next.js 기반이라 __NEXT_DATA__ 활용)
      const nextDataScript = $('#__NEXT_DATA__').html();
      
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const recruitments = nextData?.props?.pageProps?.recruitments || [];
          
          for (const job of recruitments) {
            // 신입/경력무관 필터링
            const career = job.career || '';
            if (career.includes('신입') || career.includes('무관') || !career) {
              jobs.push({
                source: 'zighang',
                title: job.title || '',
                company: job.company?.name || '',
                link: `${BASE_URL}/recruitment/${job.id}`,
                career: career || '경력무관',
                location: job.location || '',
                deadline: job.deadline || null,
                crawledAt: new Date().toISOString(),
              });
            }
          }
        } catch (parseError) {
          console.error('직항 데이터 파싱 오류:', parseError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('직항 크롤링 오류:', error.message);
  }
  
  // 중복 제거
  const uniqueJobs = jobs.filter((job, index, self) =>
    index === self.findIndex(j => j.link === job.link)
  );
  
  return uniqueJobs;
}
