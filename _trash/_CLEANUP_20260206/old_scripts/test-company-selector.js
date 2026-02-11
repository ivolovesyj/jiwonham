import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

async function testSelector() {
  console.log('🔍 CSS 셀렉터 테스트...\n');

  const response = await axios.get('https://zighang.com/company/0f40c99e-93e5-4eec-aae8-8f4d2b152464', {
    headers: HEADERS,
    timeout: 15000,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // 사용자 제공 셀렉터
  const selector = 'body > div.flex.h-full.min-h-dvh.w-screen.flex-col.lg\\:min-w-0.lg\\:flex-row.bg-subtle > main > div > div > div > div.flex.flex-col.gap-20.pt-24 > div.flex.items-center > div > div.flex.flex-col.justify-center.gap-4 > div.flex.items-center.gap-8 > div:nth-child(1) > div';

  const element = $(selector);

  console.log('셀렉터:', selector);
  console.log('매칭된 요소 개수:', element.length);

  if (element.length > 0) {
    console.log('\n✅ 요소 발견!');
    console.log('텍스트 내용:', element.text().trim());
    console.log('HTML:', element.html());
  } else {
    console.log('\n❌ 요소를 찾을 수 없습니다.');

    // 간단한 셀렉터로 시도
    console.log('\n대체 방법 시도...\n');

    // 기업 유형 관련 클래스나 텍스트 찾기
    const types = ['대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공공기관'];

    types.forEach(type => {
      const found = $(`*:contains("${type}")`).first();
      if (found.length > 0) {
        console.log(`"${type}" 발견:`);
        console.log('  태그:', found.prop('tagName'));
        console.log('  클래스:', found.attr('class'));
        console.log('  텍스트:', found.text().trim().substring(0, 100));
        console.log('');
      }
    });
  }
}

testSelector();
