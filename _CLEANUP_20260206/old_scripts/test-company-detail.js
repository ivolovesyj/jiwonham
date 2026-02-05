import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

function extractRecruitmentFromRsc(html) {
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    rscChunks.push(decoded);
  }
  const fullRsc = rscChunks.join('');

  const recruitStart = fullRsc.indexOf('"recruitment":{');
  if (recruitStart === -1) return null;

  const objStart = recruitStart + '"recruitment":'.length;
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < fullRsc.length; i++) {
    if (fullRsc[i] === '{') depth++;
    else if (fullRsc[i] === '}') {
      depth--;
      if (depth === 0) {
        objEnd = i + 1;
        break;
      }
    }
  }

  try {
    return JSON.parse(fullRsc.substring(objStart, objEnd));
  } catch {
    return null;
  }
}

async function findCompanyWithDetails() {
  console.log('🔍 hasDetailInfo=true인 회사 찾는 중...\n');

  // 직항 API에서 공고 목록 가져오기
  const response = await axios.get('https://zighang.com/seo/sitemap/sitemap-recruitment-1.xml', {
    headers: HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(response.data, { xmlMode: true });
  const urls = [];

  $('url').each((_, el) => {
    const loc = $(el).find('loc').text().trim();
    urls.push(loc);
  });

  console.log(`📊 ${urls.length}개 URL 중에서 샘플링...\n`);

  // 50개씩 샘플링해서 hasDetailInfo=true 찾기
  for (let i = 0; i < Math.min(50, urls.length); i++) {
    const url = urls[i];
    try {
      const jobResponse = await axios.get(url, {
        headers: HEADERS,
        timeout: 8000,
      });

      const recruitment = extractRecruitmentFromRsc(jobResponse.data);

      if (recruitment?.company?.hasDetailInfo) {
        console.log(`✅ 발견! ${recruitment.company.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   company 객체:`, JSON.stringify(recruitment.company, null, 2));
        return { url, recruitment };
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   진행: ${i + 1}/50 확인...`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      // Skip errors
    }
  }

  console.log('\n⚠️  50개 샘플에서 hasDetailInfo=true를 찾지 못했습니다.');
  console.log('대기업/유명 스타트업 URL을 직접 테스트해보겠습니다...\n');

  // 유명 회사 공고 찾기
  const knownCompanies = ['카카오', '네이버', '쿠팡', '토스', '당근', '배달의민족', '라인'];

  for (const companyName of knownCompanies) {
    console.log(`🔎 "${companyName}" 검색 중...`);
    // 간단하게 처음 100개 중에서 검색
    for (let i = 0; i < Math.min(100, urls.length); i++) {
      try {
        const jobResponse = await axios.get(urls[i], {
          headers: HEADERS,
          timeout: 5000,
        });

        const recruitment = extractRecruitmentFromRsc(jobResponse.data);

        if (recruitment?.company?.name?.includes(companyName)) {
          console.log(`   ✅ ${recruitment.company.name} 발견!`);
          console.log(`   company:`, JSON.stringify(recruitment.company, null, 2));
          if (recruitment.company.hasDetailInfo) {
            return { url: urls[i], recruitment };
          }
        }

        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        // Skip
      }
    }
  }

  console.log('\n❌ 회사 상세 정보를 가진 공고를 찾지 못했습니다.');
}

findCompanyWithDetails();
