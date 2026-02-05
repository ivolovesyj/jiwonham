import axios from 'axios';
import * as cheerio from 'cheerio';

const SAMPLE_URL = 'https://zighang.com/recruitment/54fdae5e-1959-4c8a-8ec5-7680da37ffd6';

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

async function testCompanyData() {
  console.log('🔍 직항 회사 데이터 구조 확인 중...\n');

  const response = await axios.get(SAMPLE_URL, {
    headers: HEADERS,
    timeout: 10000,
  });

  const html = response.data;
  const recruitment = extractRecruitmentFromRsc(html);

  if (recruitment) {
    console.log('📦 recruitment 객체 필드 목록:');
    console.log(Object.keys(recruitment).sort());

    console.log('\n🏢 회사 관련 필드:');
    if (recruitment.company) {
      console.log('company 필드:', Object.keys(recruitment.company).sort());
      console.log('\ncompany 객체 샘플:');
      console.log(JSON.stringify(recruitment.company, null, 2));
    }

    // 회사 규모/유형 관련 필드 찾기
    console.log('\n🔎 회사 규모/유형 관련 필드 검색:');
    const companyRelated = Object.keys(recruitment).filter(key =>
      key.toLowerCase().includes('company') ||
      key.toLowerCase().includes('size') ||
      key.toLowerCase().includes('type') ||
      key.toLowerCase().includes('category') ||
      key.toLowerCase().includes('scale')
    );
    console.log('발견된 필드:', companyRelated);

    companyRelated.forEach(key => {
      console.log(`\n${key}:`, recruitment[key]);
    });
  } else {
    console.log('❌ RSC 데이터를 추출할 수 없습니다.');
  }
}

testCompanyData();
