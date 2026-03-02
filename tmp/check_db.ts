import { db } from "../server/db";
import { users, resources, tasks, subjects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function check() {
    const allUsers = await db.select().from(users);
    console.log("Users:", allUsers.map(u => ({ id: u.id, username: u.username })));

    const allSubjects = await db.select().from(subjects);
    console.log("Subjects:", allSubjects.map(s => ({ id: s.id, name: s.name, userId: s.userId })));

    const allTasks = await db.select().from(tasks);
    console.log("Tasks:", allTasks.map(t => ({ id: t.id, title: t.title, deadline: t.deadline })));
}

check();
