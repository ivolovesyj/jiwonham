const axios = require('axios');

axios.get('https://zighang.com/recruitment/fd384b30-ddbd-4548-aa87-72ee4636abef', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  timeout: 15000
}).then(res => {
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  
  while ((match = regex.exec(res.data)) !== null) {
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
    console.log('recruitment 객체를 찾을 수 없습니다.');
    return;
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
  
  // education 관련 필드 찾기
  console.log('=== Education 관련 필드 ===');
  Object.keys(recruitment).filter(k => k.toLowerCase().includes('edu')).forEach(k => {
    console.log(k + ':', JSON.stringify(recruitment[k], null, 2));
  });
  
  // 학력 관련 필드 찾기
  console.log('\n=== 학력/자격 관련 필드 ===');
  Object.keys(recruitment).filter(k => {
    const lower = k.toLowerCase();
    return lower.includes('qual') || lower.includes('require') || lower.includes('degree');
  }).forEach(k => {
    console.log(k + ':', JSON.stringify(recruitment[k], null, 2));
  });
  
  // 모든 필드 출력
  console.log('\n=== 모든 필드 목록 ===');
  console.log(Object.keys(recruitment).sort().join('\n'));
  
}).catch(err => {
  console.error('Error:', err.message);
});
