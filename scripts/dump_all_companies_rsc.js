
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
    const dumpsPath = path.resolve('rsc_dumps.json');
    if (!fs.existsSync(dumpsPath)) {
        console.error('rsc_dumps.json not found.');
        return;
    }

    const dumps = JSON.parse(fs.readFileSync(dumpsPath, 'utf-8'));
    const companies = dumps
        .map(d => d.data?.company)
        .filter(c => c && c.id)
        .map(c => ({ id: c.id, name: c.name }));

    const uniqueCompanies = [...new Map(companies.map(item => [item.id, item])).values()];
    const outputFile = 'all_companies_rsc_dump.txt';

    // Clear file
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    console.log(`Dumping RSC for ${uniqueCompanies.length} companies to ${outputFile}...`);

    for (const comp of uniqueCompanies) {
        const url = `https://zighang.com/company/${comp.id}`;

        try {
            const resp = await axios.get(url, { headers: HEADERS });
            const fullRsc = extractRsc(resp.data);

            const separator = `\n\n${'='.repeat(80)}\nCOMPANY: ${comp.name} (${comp.id})\nURL: ${url}\n${'='.repeat(80)}\n\n`;

            fs.appendFileSync(outputFile, separator + fullRsc);
            console.log(`Saved: ${comp.name}`);

        } catch (e) {
            console.error(`Failed ${comp.name}: ${e.message}`);
            const errorMsg = `\n\n${'='.repeat(80)}\nCOMPANY: ${comp.name}\nFAILED TO FETCH: ${e.message}\n${'='.repeat(80)}\n\n`;
            fs.appendFileSync(outputFile, errorMsg);
        }
    }
    console.log('Done.');
}

run();
