import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

/**
 * ProseMirror JSON을 평문으로 변환
 */
function prosemirrorToText(pmDoc) {
  if (!pmDoc || typeof pmDoc !== 'object') return '';
  
  function extract(node) {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extract).join('');
    }
    return '';
  }
  
  return extract(pmDoc);
}

async function testEducationExtraction() {
  const testUrls = [
    { url: 'https://zighang.com/recruitment/b475d71e-6c4a-43f3-9b5f-e34b1986d5d4', company: '레브잇' },
    { url: 'https://zighang.com/recruitment/48a31e41-f010-4ed1-83f1-2674ac8284b7', company: '토스증권' },
    { url: 'https://zighang.com/recruitment/259b04df-6581-4f4a-b251-dc927422735d', company: '당근' },
  ];

  for (const test of testUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`회사: ${test.company}`);
    console.log(`URL: ${test.url}`);
    console.log('='.repeat(80));

    try {
      const response = await axios.get(test.url, {
        headers: HEADERS,
        timeout: 10000,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // RSC 파싱
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

      // recruitment 객체 찾기
      const recruitStart = fullRsc.indexOf('"recruitment":{');
      if (recruitStart === -1) {
        console.log('❌ recruitment 객체를 찾을 수 없습니다.');
        continue;
      }

      let depth = 0;
      let objStart = recruitStart + '"recruitment":'.length;
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

      const recruitJson = fullRsc.substring(objStart, objEnd);
      const recruitment = JSON.parse(recruitJson);

      // 1. education 필드 직접 확인
      console.log('\n🔍 1. RSC에 education 필드가 있는지 확인:');
      if (recruitment.education !== undefined) {
        console.log(`✅ recruitment.education 존재: "${recruitment.education}"`);
      } else {
        console.log('❌ recruitment.education 필드 없음');
      }

      // 2. 모든 키 출력 (education 관련)
      console.log('\n🔍 2. Education 관련 키 검색:');
      const eduKeys = Object.keys(recruitment).filter(k => k.toLowerCase().includes('edu'));
      if (eduKeys.length > 0) {
        eduKeys.forEach(key => {
          console.log(`   ${key}: ${JSON.stringify(recruitment[key])}`);
        });
      } else {
        console.log('   Education 관련 키 없음');
      }

      // 3. content/summary에서 학력 정보 찾기
      console.log('\n🔍 3. Content/Summary 분석:');
      const contentText = prosemirrorToText(recruitment.content) || prosemirrorToText(recruitment.summary) || '';
      
      if (contentText) {
        console.log(`   전체 텍스트 길이: ${contentText.length}자`);
        
        // 학력 키워드 검색
        const eduKeywords = ['학력', '학사', '석사', '박사', '대졸', '고졸', '전문대', '무관'];
        const foundKeywords = [];
        
        eduKeywords.forEach(keyword => {
          if (contentText.includes(keyword)) {
            foundKeywords.push(keyword);
            
            // 해당 키워드 주변 텍스트 추출
            const index = contentText.indexOf(keyword);
            const start = Math.max(0, index - 50);
            const end = Math.min(contentText.length, index + 50);
            const snippet = contentText.substring(start, end);
            
            console.log(`\n   ✅ "${keyword}" 발견:`);
            console.log(`      ${snippet.replace(/\n/g, ' ')}`);
          }
        });
        
        if (foundKeywords.length === 0) {
          console.log('   ⚠️  학력 관련 키워드를 찾을 수 없습니다.');
        }
      } else {
        console.log('   ❌ Content/Summary가 비어있습니다.');
      }

      // 4. 자격요건 섹션만 추출
      console.log('\n🔍 4. 자격요건 섹션 분석:');
      const lines = contentText.split('\n');
      let inRequirements = false;
      let requirementsText = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // 자격요건 섹션 시작
        if (/^(자격요건|자격\s*조건|지원\s*자격|필수\s*요건|필수\s*조건|응모\s*자격|채용\s*조건|필요\s*역량|지원\s*조건)/.test(trimmed)) {
          inRequirements = true;
          requirementsText += trimmed + '\n';
          continue;
        }
        
        // 다른 섹션 시작하면 종료
        if (inRequirements && /^(우대사항|우대\s*조건|복리후생|근무환경|담당업무|주요업무)/.test(trimmed)) {
          inRequirements = false;
          break;
        }
        
        if (inRequirements) {
          requirementsText += trimmed + '\n';
        }
      }
      
      if (requirementsText) {
        console.log('   자격요건 섹션:');
        console.log('   ' + '-'.repeat(70));
        console.log('   ' + requirementsText.substring(0, 500).replace(/\n/g, '\n   '));
        if (requirementsText.length > 500) {
          console.log('   ... (생략)');
        }
      } else {
        console.log('   ⚠️  자격요건 섹션을 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testEducationExtraction();
