import "./server/env.js";
import { db } from "./server/storage.js";
import { resources } from "./shared/schema.js";

async function check() {
    const res = await db.select().from(resources);
    console.log("Resources List:");
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}
check();
