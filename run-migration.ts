import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function main() {
    console.log("Starting manual migrations...");

    try {
        // 1. Update group_messages table
        console.log("Updating group_messages...");
        await db.execute(sql`
      ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS is_edited integer NOT NULL DEFAULT 0;
      ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS is_deleted integer NOT NULL DEFAULT 0;
      ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_url text;
      ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_type text;
      ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_name text;
    `);
        console.log("✅ group_messages updated");

        // 2. Update group_members table
        console.log("Updating group_members...");
        await db.execute(sql`
      ALTER TABLE group_members ADD COLUMN IF NOT EXISTS contribution_score integer NOT NULL DEFAULT 0;
      ALTER TABLE group_members ADD COLUMN IF NOT EXISTS last_seen_at text;
    `);
        console.log("✅ group_members updated");

        // 3. Update study_groups table
        console.log("Updating study_groups...");
        await db.execute(sql`
      ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS avatar_url text;
    `);
        console.log("✅ study_groups updated");

        console.log("All migrations successfully applied! 🎉");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

main();
