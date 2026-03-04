import { db } from "./server/storage.js";
import { resources } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function check() {
    const res = await db.select().from(resources).where(eq(resources.id, 6));
    console.log("Resource 6:", JSON.stringify(res, null, 2));
}
check();
