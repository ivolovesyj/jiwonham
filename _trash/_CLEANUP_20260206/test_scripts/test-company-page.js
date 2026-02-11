import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

async function testCompanyPage() {
  // 테스트에서 크롤링 시도한 회사 ID
  const testCompanies = [
    { id: 'f648890f-476c-4474-b22c-c33a00022ca3', name: '서울옥션' },
    { id: '40e41dcd-3e3f-44ff-b4fc-fbace8ff0e79', name: '놀유니버스' },
    { id: 'a5daa252-32b9-4aab-beff-ec2c3f5b37b4', name: '오픈갤러리' },
  ];

  for (const company of testCompanies) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`회사: ${company.name} (${company.id})`);
    console.log('='.repeat(80));

    try {
      const companyUrl = `https://zighang.com/company/${company.id}`;
      const response = await axios.get(companyUrl, {
        headers: HEADERS,
        timeout: 10000,
      });

      const html = response.data;

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

      // meta keywords 찾기
      console.log('\n🔍 Meta Keywords 검색:');
      const metaMatches = fullRsc.match(/\["[^"]*","meta","[^"]*",\{[^}]*"name":"keywords"[^}]*\}\]/g);
      
      if (metaMatches) {
        console.log(`✅ ${metaMatches.length}개의 meta keywords 발견:`);
        metaMatches.forEach((m, idx) => {
          console.log(`\n[${idx + 1}] ${m.substring(0, 200)}...`);
          
          // content 추출
          const contentMatch = m.match(/"content":"([^"]+)"/);
          if (contentMatch) {
            const keywords = contentMatch[1].split(',').map(k => k.trim());
            console.log(`   Keywords: ${keywords.join(' | ')}`);
            console.log(`   총 ${keywords.length}개`);
            if (keywords.length >= 2) {
              console.log(`   뒤에서 두 번째: "${keywords[keywords.length - 2]}"`);
            }
          }
        });
      } else {
        console.log('❌ Meta keywords를 찾을 수 없습니다.');
      }

      // ["$","meta","3" 패턴 검색
      console.log('\n\n🔍 특정 패턴 검색 (["$","meta","3"):');
      const specificMatch = fullRsc.match(/\["\$","meta","3",\{[^}]*"name":"keywords"[^}]*\}\]/);
      if (specificMatch) {
        console.log('✅ 패턴 발견:');
        console.log(specificMatch[0]);
      } else {
        console.log('❌ 패턴을 찾을 수 없습니다.');
      }

      // 전체 meta 태그들 검색
      console.log('\n\n🔍 모든 Meta 태그:');
      const allMetaMatches = fullRsc.match(/\["[^"]*","meta","[^"]*",\{[^}]*\}\]/g);
      if (allMetaMatches) {
        console.log(`✅ ${allMetaMatches.length}개의 meta 태그 발견`);
        allMetaMatches.slice(0, 5).forEach((m, idx) => {
          console.log(`\n[${idx + 1}] ${m.substring(0, 150)}...`);
        });
      }

    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testCompanyPage();
