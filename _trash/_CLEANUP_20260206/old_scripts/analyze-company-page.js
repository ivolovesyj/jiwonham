import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

async function analyzePages() {
  console.log('📥 기업 상세 페이지 다운로드 중...\n');

  const detailResponse = await axios.get('https://zighang.com/company/0f40c99e-93e5-4eec-aae8-8f4d2b152464', {
    headers: HEADERS,
    timeout: 15000,
  });

  // HTML 저장
  fs.writeFileSync('_temp_company_detail.html', detailResponse.data, 'utf-8');
  console.log('✅ HTML 저장: _temp_company_detail.html');

  // RSC 청크 추출
  const html = detailResponse.data;
  const rscPattern = /self\.__next_f\.push\(\[1,"([^"]+)"\]\)/g;
  const matches = [...html.matchAll(rscPattern)];

  console.log(`\n📦 RSC 청크 ${matches.length}개 발견\n`);

  // 모든 청크 합치기
  const fullRsc = matches.map(m => {
    return m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }).join('');

  // 파일로 저장
  fs.writeFileSync('_temp_rsc_data.txt', fullRsc, 'utf-8');
  console.log('✅ RSC 데이터 저장: _temp_rsc_data.txt');

  // "company" 키워드 주변 텍스트 추출
  console.log('\n🔎 "company" 키워드가 포함된 JSON 객체 찾기...\n');

  const companyMatches = [...fullRsc.matchAll(/"company":\{[^}]*?"name":"([^"]+)"[^}]*?\}/g)];
  console.log(`발견된 company 객체: ${companyMatches.length}개`);
  companyMatches.slice(0, 3).forEach((m, i) => {
    console.log(`\n[${i + 1}] ${m[0].substring(0, 200)}...`);
  });

  // "type"이나 "category" 키워드 찾기
  console.log('\n\n🔎 "type", "category", "companyType" 키워드 찾기...\n');

  const typeMatches = [
    ...fullRsc.matchAll(/"(?:company)?[Tt]ype":"([^"]+)"/g),
    ...fullRsc.matchAll(/"category":"([^"]+)"/g),
  ];

  console.log(`발견: ${typeMatches.length}개`);
  typeMatches.slice(0, 10).forEach(m => {
    console.log(`  ${m[0]}`);
  });

  // Cheerio로 메타 태그 확인
  console.log('\n\n🔎 HTML 메타 태그 확인...\n');
  const $ = cheerio.load(html);

  console.log('og:title:', $('meta[property="og:title"]').attr('content'));
  console.log('og:description:', $('meta[property="og:description"]').attr('content'));

  // h1, h2 태그 확인
  console.log('\n주요 헤딩:');
  $('h1, h2').each((i, el) => {
    if (i < 5) {
      console.log(`  ${$(el).prop('tagName')}: ${$(el).text().trim()}`);
    }
  });
}

analyzePages();
