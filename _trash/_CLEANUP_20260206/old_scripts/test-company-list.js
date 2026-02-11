import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

function extractFromRsc(html, key) {
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

  const keyStart = fullRsc.indexOf(`"${key}":`);
  if (keyStart === -1) return null;

  // 배열이나 객체 시작점 찾기
  const valueStart = keyStart + `"${key}":`.length;
  let char = fullRsc[valueStart];
  while (char === ' ') {
    char = fullRsc[++valueStart];
  }

  if (char === '[') {
    // 배열 추출
    let depth = 0;
    let end = valueStart;
    for (let i = valueStart; i < fullRsc.length; i++) {
      if (fullRsc[i] === '[') depth++;
      else if (fullRsc[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    try {
      return JSON.parse(fullRsc.substring(valueStart, end));
    } catch {
      return null;
    }
  } else if (char === '{') {
    // 객체 추출
    let depth = 0;
    let end = valueStart;
    for (let i = valueStart; i < fullRsc.length; i++) {
      if (fullRsc[i] === '{') depth++;
      else if (fullRsc[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    try {
      return JSON.parse(fullRsc.substring(valueStart, end));
    } catch {
      return null;
    }
  }

  return null;
}

async function testCompanyList() {
  console.log('🔍 기업 리스트 페이지 구조 확인...\n');

  const response = await axios.get('https://zighang.com/company', {
    headers: HEADERS,
    timeout: 15000,
  });

  const html = response.data;

  // RSC에서 companies 데이터 추출
  const companies = extractFromRsc(html, 'companies');

  if (companies) {
    console.log(`✅ 기업 리스트 추출 성공! (${companies.length}개)`);
    console.log('\n첫 번째 기업 샘플:');
    console.log(JSON.stringify(companies[0], null, 2));
  } else {
    console.log('⚠️  RSC에서 companies 추출 실패, 다른 키 시도...');

    // 페이지 소스에서 데이터 구조 찾기
    const $ = cheerio.load(html);
    $('script[type="application/ld+json"]').each((_, el) => {
      console.log('LD+JSON:', $(el).html());
    });
  }

  console.log('\n\n🔍 기업 상세 페이지 구조 확인...\n');

  const detailResponse = await axios.get('https://zighang.com/company/0f40c99e-93e5-4eec-aae8-8f4d2b152464', {
    headers: HEADERS,
    timeout: 15000,
  });

  const detailHtml = detailResponse.data;
  const company = extractFromRsc(detailHtml, 'company');

  if (company) {
    console.log('✅ 기업 상세 정보 추출 성공!');
    console.log('\ncompany 필드 목록:');
    console.log(Object.keys(company).sort());
    console.log('\ncompany 전체 데이터:');
    console.log(JSON.stringify(company, null, 2));

    // 기업 유형 관련 필드 찾기
    console.log('\n🏢 기업 유형 관련 필드:');
    const typeFields = Object.keys(company).filter(key =>
      key.toLowerCase().includes('type') ||
      key.toLowerCase().includes('category') ||
      key.toLowerCase().includes('size') ||
      key.toLowerCase().includes('scale') ||
      key.toLowerCase().includes('kind')
    );
    console.log('발견:', typeFields);
    typeFields.forEach(key => {
      console.log(`  ${key}:`, company[key]);
    });
  } else {
    console.log('❌ 기업 상세 정보 추출 실패');
  }
}

testCompanyList();
