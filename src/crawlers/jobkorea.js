import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.jobkorea.co.kr';

// 마케팅/광고 관련 직무 코드
const MARKETING_DUTY_CODES = [
  '10016', // 마케팅
  '10017', // 광고/홍보
];

export async function crawlJobKorea() {
  const jobs = [];
  
  for (const dutyCode of MARKETING_DUTY_CODES) {
    try {
      const url = `${BASE_URL}/recruit/joblist?menucode=duty&duession=${dutyCode}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        timeout: 10000,
      });
      const $ = cheerio.load(response.data);
      
      // 채용공고 목록 파싱
      $('.list-post .post').each((_, element) => {
        const $el = $(element);
        
        const title = $el.find('.post-list-info .title').text().trim();
        const company = $el.find('.post-list-corp .name').text().trim();
        const link = $el.find('.post-list-info a').attr('href');
        const career = $el.find('.post-list-info .option .exp').text().trim();
        const education = $el.find('.post-list-info .option .edu').text().trim();
        const location = $el.find('.post-list-info .option .loc').text().trim();
        const deadline = $el.find('.post-list-info .date').text().trim();
        
        // 신입 공고만 필터링
        if (career.includes('신입') || career.includes('경력무관')) {
          jobs.push({
            source: 'jobkorea',
            title,
            company,
            link: link ? `${BASE_URL}${link}` : null,
            career,
            education,
            location,
            deadline,
            crawledAt: new Date().toISOString(),
          });
        }
      });
      
    } catch (error) {
      console.error(`잡코리아 크롤링 오류 (${dutyCode}):`, error.message);
    }
  }
  
  return jobs;
}
