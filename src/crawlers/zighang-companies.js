import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';
const COMPANY_LIST_URL = `${BASE_URL}/company`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

const DELAY_MS = 300; // 요청 간 딜레이
const CONCURRENCY = 5; // 동시 요청 수

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * RSC flight data에서 특정 키의 데이터 추출
 */
function extractFromRsc(html, key) {
  // Next.js RSC 청크 추출
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[\d+,"([^"]+)"\]\)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const decoded = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
      rscChunks.push(decoded);
    } catch (e) {
      // Skip invalid chunks
    }
  }

  const fullRsc = rscChunks.join('');

  // key 위치 찾기
  const keyPattern = new RegExp(`"${key}":(\\{|\\[)`);
  const keyMatch = fullRsc.match(keyPattern);

  if (!keyMatch) return null;

  const startIdx = fullRsc.indexOf(keyMatch[0]) + `"${key}":`.length;
  const isArray = keyMatch[1] === '[';
  const openChar = isArray ? '[' : '{';
  const closeChar = isArray ? ']' : '}';

  let depth = 0;
  let endIdx = startIdx;

  for (let i = startIdx; i < fullRsc.length; i++) {
    if (fullRsc[i] === openChar) depth++;
    else if (fullRsc[i] === closeChar) {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  try {
    return JSON.parse(fullRsc.substring(startIdx, endIdx));
  } catch (e) {
    return null;
  }
}

/**
 * 기업 유형 추출 (og:description에서)
 */
function extractCompanyType(description) {
  if (!description) return '기타';

  const desc = description.toLowerCase();

  // 우선순위대로 체크
  if (desc.includes('외국계') || desc.includes('외자계')) return '외국계';
  if (desc.includes('공공기관') || desc.includes('공기업')) return '공공기관';
  if (desc.includes('유니콘')) return '유니콘';
  if (desc.includes('대기업')) return '대기업';
  if (desc.includes('중견기업') || desc.includes('중견')) return '중견기업';
  if (desc.includes('중소기업') || desc.includes('중소')) return '중소기업';
  if (desc.includes('스타트업') || desc.includes('벤처')) return '스타트업';

  return '기타';
}

/**
 * 1. 기업 리스트 페이지에서 모든 기업 ID 수집
 */
export async function fetchCompanyList() {
  console.log('📋 기업 리스트 페이지 크롤링 시작...\n');

  const response = await axios.get(COMPANY_LIST_URL, {
    headers: HEADERS,
    timeout: 15000,
  });

  const html = response.data;

  // 방법 1: RSC에서 companies 배열 추출
  const companies = extractFromRsc(html, 'companies');

  if (companies && Array.isArray(companies)) {
    console.log(`✅ RSC에서 ${companies.length}개 기업 발견`);
    return companies.map(c => ({
      id: c.id,
      name: c.name,
      image: c.image || null,
    }));
  }

  // 방법 2: HTML에서 링크 추출
  const $ = cheerio.load(html);
  const companyIds = new Set();

  $('a[href^="/company/"]').each((_, el) => {
    const href = $(el).attr('href');
    const match = href.match(/\/company\/([a-f0-9-]+)$/);
    if (match) {
      companyIds.add(match[1]);
    }
  });

  if (companyIds.size > 0) {
    console.log(`✅ HTML 링크에서 ${companyIds.size}개 기업 발견`);
    return Array.from(companyIds).map(id => ({ id, name: null, image: null }));
  }

  console.log('⚠️  기업 리스트를 찾을 수 없습니다.');
  return [];
}

/**
 * 2. 개별 기업 상세 페이지 크롤링
 */
export async function fetchCompanyDetail(companyId) {
  try {
    const url = `${BASE_URL}/company/${companyId}`;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // OG 메타 태그에서 정보 추출
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    // 회사명 추출 (og:title에서)
    const nameMatch = ogTitle.match(/^\((.+?)\)/);
    const name = nameMatch ? nameMatch[1] : '';

    // 기업 유형 추출
    const companyType = extractCompanyType(ogDesc);

    // RSC에서 추가 정보 추출 시도
    const companyData = extractFromRsc(html, 'company');

    return {
      id: companyId,
      name: companyData?.name || name,
      image: companyData?.image || null,
      company_type: companyType,
      description: ogDesc.substring(0, 500), // 처음 500자만
      crawled_at: new Date().toISOString(),
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // 삭제된 기업
    }
    console.error(`  ✗ ${companyId}: ${error.message}`);
    return null;
  }
}

/**
 * 3. 전체 기업 크롤링 (병렬 처리)
 */
export async function crawlAllCompanies({ onBatch = null, onProgress = null } = {}) {
  console.log('\n🚀 직항 기업 정보 크롤링 시작');
  console.log(`   시간: ${new Date().toLocaleString('ko-KR')}\n`);

  // 1. 기업 리스트 가져오기
  const companyList = await fetchCompanyList();

  if (companyList.length === 0) {
    console.log('❌ 크롤링할 기업이 없습니다.');
    return [];
  }

  console.log(`\n📊 총 ${companyList.length}개 기업 상세 정보 수집 시작\n`);

  const results = [];
  const total = companyList.length;
  let processed = 0;
  let success = 0;
  let failed = 0;

  // 병렬 처리
  for (let i = 0; i < companyList.length; i += CONCURRENCY) {
    const batch = companyList.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (company) => {
        const detail = await fetchCompanyDetail(company.id);
        await sleep(DELAY_MS);
        return detail;
      })
    );

    // 성공한 것만 추가
    const validResults = batchResults.filter(r => r !== null);
    results.push(...validResults);

    processed += batch.length;
    success += validResults.length;
    failed += batch.length - validResults.length;

    // 진행 상황 출력
    console.log(`  진행: ${processed}/${total} (성공: ${success}, 실패: ${failed})`);

    // 진행 상황 콜백
    if (onProgress) {
      onProgress({ processed, total, success, failed });
    }

    // 배치 저장 콜백
    if (onBatch && validResults.length > 0) {
      await onBatch(validResults);
    }
  }

  console.log(`\n✅ 크롤링 완료!`);
  console.log(`   성공: ${success}개`);
  console.log(`   실패: ${failed}개`);
  console.log(`   총: ${total}개\n`);

  return results;
}
