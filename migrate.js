import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ckE94AKXTlDO@ep-proud-shadow-ait8245m-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
    try {
        await pool.query('ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_index integer NOT NULL DEFAULT 0;');
        console.log('Added correct_index.');
    } catch (e) {
        console.log('Error adding correct_index:', e.message);
    }

    try {
        await pool.query('ALTER TABLE study_groups ADD CONSTRAINT study_groups_invite_code_unique UNIQUE (invite_code);');
        console.log('Added unique constraint to study_groups.');
    } catch (e) {
        console.log('Error adding unique constraint:', e.message);
    }

    process.exit(0);
}
run();
