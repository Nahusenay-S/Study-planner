import pg from 'pg';
const { Pool } = pg;
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
        console.error("DATABASE_URL is not defined");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log("Creating Premium tables...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS group_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                group_id INTEGER REFERENCES study_groups(id) ON DELETE CASCADE,
                resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                is_battle INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id SERIAL PRIMARY KEY,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                options TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                explanation TEXT
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_results (
                id SERIAL PRIMARY KEY,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                completed_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("Premium tables created.");
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
