import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';

/**
 * 공고 상세 정보 가져오기
 */
async function getJobDetail(jobId) {
  try {
    const response = await axios.get(`${BASE_URL}/recruitment/${jobId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 5000,
    });

    const $ = cheerio.load(response.data);
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript);
      const recruitment = nextData?.props?.pageProps?.recruitment;
      
      if (recruitment) {
        return {
          intro: recruitment.intro || '',
          main_tasks: recruitment.mainTasks || '',
          requirements: recruitment.requirements || '',
          preferred_points: recruitment.preferredPoints || '',
          benefits: recruitment.benefits || '',
          work_conditions: recruitment.workConditions || '',
          deadline: recruitment.deadline || recruitment.endDate || recruitment.dueDate || null,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`  상세 정보 오류 (${jobId}):`, error.message);
    return null;
  }
}

export async function crawlZighang() {
  const jobs = [];
  
  try {
    const searchTerms = ['마케팅', '브랜드'];
    
    for (const term of searchTerms) {
      const encodedTerm = encodeURIComponent(term);
      const url = `${BASE_URL}/search?q=${encodedTerm}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const nextDataScript = $('#__NEXT_DATA__').html();
      
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const recruitments = nextData?.props?.pageProps?.recruitments || [];
          
          for (const job of recruitments.slice(0, 10)) {
            const career = job.career || '';
            if (career.includes('신입') || career.includes('무관') || !career) {
              console.log(`  - ${job.company?.name}: ${job.title}`);
              
              const jobData = {
                source: 'zighang',
                title: job.title || '',
                company: job.company?.name || '',
                link: `${BASE_URL}/recruitment/${job.id}`,
                jobId: job.id,
                career: career || '경력무관',
                location: job.location || '',
                deadline: null, // 상세 정보에서 가져옴
                crawledAt: new Date().toISOString(),
              };

              const detail = await getJobDetail(job.id);
              if (detail) {
                // deadline을 상세 정보에서 추출
                if (detail.deadline) {
                  jobData.deadline = detail.deadline;
                }
                jobData.detail = detail;
              }

              jobs.push(jobData);
              await new Promise(resolve => setTimeout(resolve, 500));
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
  
  const uniqueJobs = jobs.filter((job, index, self) =>
    index === self.findIndex(j => j.link === job.link)
  );
  
  return uniqueJobs;
}
