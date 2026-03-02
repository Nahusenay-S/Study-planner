import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

async function migrate() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (!match) throw new Error('No DATABASE_URL in .env');
    const url = match[1].trim();

    const pool = new Pool({ connectionString: url });
    try {
        console.log('Starting Phase 2 Migration...');

        // 1. Create study_groups
        await pool.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name text NOT NULL,
        description text,
        invite_code text NOT NULL UNIQUE,
        created_by integer NOT NULL REFERENCES users(id),
        created_at text NOT NULL DEFAULT now()
      )
    `);
        console.log('✓ study_groups table created');

        // 2. Create group_members
        await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id integer NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'member',
        joined_at text NOT NULL DEFAULT now()
      )
    `);
        console.log('✓ group_members table created');

        // 3. Update tasks and resources columns
        // Check if column exists first
        const taskCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'");
        const taskColNames = taskCols.rows.map(r => r.column_name);

        if (!taskColNames.includes('group_id')) {
            await pool.query("ALTER TABLE tasks ADD COLUMN group_id integer REFERENCES study_groups(id) ON DELETE CASCADE");
        }
        if (!taskColNames.includes('assigned_to')) {
            await pool.query("ALTER TABLE tasks ADD COLUMN assigned_to integer REFERENCES users(id) ON DELETE SET NULL");
        }
        console.log('✓ tasks table updated');

        const resourceCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'resources'");
        const resourceColNames = resourceCols.rows.map(r => r.column_name);

        if (!resourceColNames.includes('group_id')) {
            await pool.query("ALTER TABLE resources ADD COLUMN group_id integer REFERENCES study_groups(id) ON DELETE CASCADE");
        }
        console.log('✓ resources table updated');

        // 4. Create comments
        await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_at text NOT NULL DEFAULT now()
      )
    `);
        console.log('✓ comments table created');

        // 5. Create notifications
        await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        message text NOT NULL,
        type text NOT NULL,
        is_read integer NOT NULL DEFAULT 0,
        created_at text NOT NULL DEFAULT now()
      )
    `);
        console.log('✓ notifications table created');

        console.log('Phase 2 Migration Complete!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
