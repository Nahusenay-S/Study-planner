import pg from 'pg';
const { Pool } = pg;

// Manually extract DATABASE_URL from .env if process.env.DATABASE_URL is missing
// (Since we are running this as a standalone script)
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^DATABASE_URL=(.*)$/m);
        if (match) {
            process.env.DATABASE_URL = match[1].trim();
        }
    }
}

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not defined in environment or .env file");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log("Adding Phase 3 columns...");

        // Check and add readiness_score to users
        const readinessCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='readiness_score';
    `);

        if (readinessCheck.rowCount === 0) {
            await pool.query('ALTER TABLE users ADD COLUMN readiness_score integer DEFAULT 0;');
            console.log("Added readiness_score to users.");
        } else {
            console.log("readiness_score already exists in users.");
        }

        // Check and add ai_summary to resources
        const aiSummaryCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='resources' AND column_name='ai_summary';
    `);

        if (aiSummaryCheck.rowCount === 0) {
            await pool.query('ALTER TABLE resources ADD COLUMN ai_summary text;');
            console.log("Added ai_summary to resources.");
        } else {
            console.log("ai_summary already exists in resources.");
        }

        console.log("Phase 3 migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
