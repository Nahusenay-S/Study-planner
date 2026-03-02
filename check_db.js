import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

async function check() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (!match) throw new Error('No DATABASE_URL in .env');
    const url = match[1].trim();

    const pool = new Pool({ connectionString: url });
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES:', res.rows.map(row => row.table_name));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

check();
