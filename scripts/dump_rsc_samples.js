
import axios from 'axios';
import fs from 'fs';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

const urls = [
    "https://zighang.com/recruitment/5966ac5b-896c-43ce-b258-3bdb0f347a10",
    "https://zighang.com/recruitment/9db93019-452b-41ad-b0a0-d44382fc48aa",
    "https://zighang.com/recruitment/48a31e41-f010-4ed1-83f1-2674ac8284b7",
    "https://zighang.com/recruitment/259b04df-6581-4f4a-b251-dc927422735d",
    "https://zighang.com/recruitment/2a76711c-202e-482b-8f82-619156a20177",
    "https://zighang.com/recruitment/32ec573d-6dfb-4ec6-9715-5da5e279fbe0",
    "https://zighang.com/recruitment/68f7dbef-f539-4bf6-ae94-741364c62325",
    "https://zighang.com/recruitment/8d7a80d4-99cd-4027-892c-ee034db8ed97",
    "https://zighang.com/recruitment/a9ab0394-73bf-4d67-8ad0-13431f43882c"
];

function extractRecruitmentFromRsc(html) {
    const rscChunks = [];
    const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        let decoded = match[1];
        try {
            decoded = JSON.parse(`"${decoded}"`);
        } catch (e) {
            decoded = decoded
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
        }
        rscChunks.push(decoded);
    }
    const fullRsc = rscChunks.join('');

    const recruitStart = fullRsc.indexOf('"recruitment":{');
    if (recruitStart === -1) return null;

    const objStart = recruitStart + '"recruitment":'.length;
    let depth = 0;
    let objEnd = objStart;
    let inString = false;

    for (let i = objStart; i < fullRsc.length; i++) {
        const char = fullRsc[i];
        if (char === '"' && fullRsc[i - 1] !== '\\') inString = !inString;
        if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') {
                depth--;
                if (depth === 0) {
                    objEnd = i + 1;
                    break;
                }
            }
        }
    }

    try {
        return JSON.parse(fullRsc.substring(objStart, objEnd));
    } catch (e) {
        console.error(`Error parsing JSON: ${e.message}`);
        return null;
    }
}

async function run() {
    const results = [];

    for (const url of urls) {
        console.log(`Fetching: ${url}`);
        try {
            const resp = await axios.get(url, { headers: HEADERS });
            const data = extractRecruitmentFromRsc(resp.data);

            const summary = {
                url,
                data: data ? data : "FAILED_TO_EXTRACT"
            };

            results.push(summary);
        } catch (e) {
            console.error(`Failed ${url}: ${e.message}`);
            results.push({ url, error: e.message });
        }
    }

    fs.writeFileSync('rsc_dumps.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('Saved to rsc_dumps.json');
}

run();
