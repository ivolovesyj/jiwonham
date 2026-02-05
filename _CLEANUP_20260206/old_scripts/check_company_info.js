
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

function extractRsc(html) {
    const rscChunks = [];
    const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        let decoded = match[1];
        try {
            decoded = JSON.parse(`"${decoded}"`);
        } catch (e) {
            decoded = decoded.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        rscChunks.push(decoded);
    }
    return rscChunks.join('');
}

async function run() {
    // 1. Read company IDs from rsc_dumps.json
    const dumpsPath = path.resolve('rsc_dumps.json');
    if (!fs.existsSync(dumpsPath)) {
        console.error('rsc_dumps.json not found. Please run dump_rsc_samples.js first.');
        return;
    }

    const dumps = JSON.parse(fs.readFileSync(dumpsPath, 'utf-8'));
    const companies = dumps
        .map(d => d.data?.company)
        .filter(c => c && c.id)
        .map(c => ({ id: c.id, name: c.name }));

    // Remove duplicates
    const uniqueCompanies = [...new Map(companies.map(item => [item.id, item])).values()];

    console.log(`Found ${uniqueCompanies.length} unique companies. Checking details...\n`);

    for (const comp of uniqueCompanies) {
        const url = `https://zighang.com/company/${comp.id}`;
        // console.log(`Checking [${comp.name}] (${url})...`);

        try {
            const resp = await axios.get(url, { headers: HEADERS });
            const fullRsc = extractRsc(resp.data);

            // Check for keywords
            const hasAddress = fullRsc.includes('주소') || fullRsc.includes('addressLocality');
            const hasType = fullRsc.includes('기업형태') || fullRsc.includes('중소기업') || fullRsc.includes('대기업') || fullRsc.includes('스타트업') || fullRsc.includes('상장');
            const hasLocality = fullRsc.includes('addressLocality'); // LD+JSON specific

            // Extract brief context if found
            let addressContext = "";
            if (hasAddress) {
                const addrIdx = fullRsc.indexOf('주소');
                if (addrIdx !== -1) addressContext = fullRsc.substring(addrIdx, addrIdx + 30).replace(/\n/g, ' ');
            }

            const logMsg = `[${comp.name}]\n` +
                `  - URL: ${url}\n` +
                `  - Has '주소' keyword?: ${hasAddress ? 'YES' : 'NO'} (${addressContext}...)\n` +
                `  - Has LD+JSON Locality?: ${hasLocality ? 'YES' : 'NO'}\n` +
                `  - Has Company Type info?: ${hasType ? 'YES' : 'NO'}\n` +
                '-'.repeat(40) + '\n';

            console.log(logMsg);
            fs.appendFileSync('company_check_result.txt', logMsg);

        } catch (e) {
            const errorMsg = `  - Failed to fetch ${comp.name}: ${e.message}\n` + '-'.repeat(40) + '\n';
            console.error(errorMsg);
            fs.appendFileSync('company_check_result.txt', errorMsg);
        }
    }
}

// Clear previous result file
if (fs.existsSync('company_check_result.txt')) fs.unlinkSync('company_check_result.txt');

run();
