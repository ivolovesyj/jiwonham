import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchJobKorea() {
  try {
    const url = 'https://www.jobkorea.co.kr/Search/?stext=%EB%A7%88%EC%BC%80%ED%8C%85&careerType=1&tabType=recruit';

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const jobs = [];

    $('.list-default .list-post').each((i, el) => {
      if (i >= 10) return;

      const company = $(el).find('.post-list-corp a').text().trim();
      const title = $(el).find('.post-list-info a.title').text().trim();
      const info = $(el).find('.post-list-info .option').text().trim();
      const link = $(el).find('.post-list-info a.title').attr('href');

      if (company && title) {
        jobs.push({ company, title, info, link: 'https://www.jobkorea.co.kr' + link });
      }
    });

    console.log(`총 ${jobs.length}개 공고\n`);
    jobs.forEach((job, i) => {
      console.log(`${i+1}. [${job.company}]`);
      console.log(`   ${job.title}`);
      console.log(`   ${job.info}`);
      console.log(`   ${job.link}`);
      console.log('');
    });

  } catch (error) {
    console.log('Error:', error.message);
  }
}

fetchJobKorea();
