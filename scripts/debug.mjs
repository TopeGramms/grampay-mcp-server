import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const r = await fetch('https://api.ivorypay.io/api/v1/transactions', {
            method: 'POST',
            headers: { Authorization: process.env.IVORYPAY_SECRET_KEY, 'Content-Type': 'application/json', 'x-env': 'test' },
            body: JSON.stringify({ amount: 500, email: 'demo@grampay.org', firstName: 'Adekalu', lastName: 'Temitope', type: 'FIAT', baseFiat: 'NGN', reference: crypto.randomUUID() })
        });
        const text = await r.text();
        fs.writeFileSync('error_dump.txt', `Status: ${r.status}\nBody: ${text}`);
    } catch (e) {
        fs.writeFileSync('error_dump.txt', e.toString());
    }
}
run();
