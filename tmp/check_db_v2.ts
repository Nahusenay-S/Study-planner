import { db } from "C:/Users/SW/Documents/Study PD/Study-planner/server/db.ts";
import { users, resources, tasks, subjects } from "C:/Users/SW/Documents/Study PD/Study-planner/shared/schema.ts";

async function check() {
    try {
        const allUsers = await db.select().from(users);
        console.log("Users Found:", allUsers.length);

        const allResources = await db.select().from(resources);
        console.log("Total Resources:", allResources.length);
        if (allResources.length > 0) {
            console.log("Latest Resource:", allResources[allResources.length - 1].title);
        }

    } catch (e) {
        console.error("Query failed", e);
    }
}

check();
