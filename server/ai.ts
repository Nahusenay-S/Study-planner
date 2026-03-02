import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "./index";

export async function generateStudySchedule(tasks: any[], subjects: any[]) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

        const prompt = `
            You are an expert academic advisor. I have the following tasks and subjects.
            Please organize them into an optimal study schedule.
            
            Subjects (with difficulty 1-5):
            ${JSON.stringify(subjects.map(s => ({ name: s.name, difficulty: s.difficultyLevel })))}
            
            Tasks:
            ${JSON.stringify(tasks.map(t => ({
            title: t.title,
            desc: t.description,
            priority: t.priority,
            deadline: t.deadline,
            est: t.estimatedMinutes
        })))}
            
            Please return a JSON array of objects representing the recommended order.
            Each object should have: taskId (if possible, else use title), reason, and suggestedDuration.
            Keep it professional and efficient.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Basic JSON extraction from markdown if LLM returns it
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { message: "AI response format invalid", raw: text };
    } catch (error) {
        log(`AI generation error: ${error}`, "ai");
        throw error;
    }
}

export async function summarizeResource(content: string, title: string) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

        const prompt = `
            Summarize the following study resource titled "${title}".
            Provide exactly 3 bullet points of the key takeaways.
            Then suggest 3-5 flashcards in Question: Answer format.
            
            Content:
            ${content.substring(0, 5000)} // Limit input for now
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        log(`AI summarization error: ${error}`, "ai");
        return `### ⚠️ AI Summary Unavailable
The AI is currently resting or unavailable (API limit reached). 

**Key Takeaways (Fallback)**:
* ${title} is an important resource.
* Please review the main content carefully.
* Ensure you understand the bolded terms.

**Practice Flashcard**:
* **Question**: What is the main topic of this resource?
* **Answer**: ${title}`;
    }
}

export async function calculateReadinessScore(userStats: any) {
    // Mixed approach: heuristic + basic scaling
    const score = Math.min(100, (userStats.streakCount * 5) + (userStats.totalStudyMinutes / 60) + (userStats.productivityScore || 0) / 10);
    return Math.round(score);
}

export async function chatWithAI(message: string, history: { role: string; content: string }[], context: { subjects: any[]; tasks: any[] }) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({
            model: "models/gemini-2.5-flash",
            systemInstruction: `You are 'StudyBuddy', a supportive AI tutor for the StudyFlow platform. 
            You help students with their studies, explain complex topics, and help them organize their tasks.
            Be concise, encouraging, and use markdown for clarity.
            The user currently has these subjects: ${context.subjects.map(s => s.name).join(", ")}.
            And these pending tasks: ${context.tasks.filter(t => t.status !== 'completed').map(t => t.title).join(", ")}.`
        });

        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === "user" ? "user" : "model",
                parts: [{ text: h.content }]
            })),
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        log(`AI chat error: ${error}`, "ai");
        throw error;
    }
}

export async function generateQuiz(content: string, title: string, options?: { count?: number }) {
    try {
        const count = options?.count || 5;

        log(`[AI] Quiz Request: ${count} questions (Multiple Choice) for "${title}"`, "ai");

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
            systemInstruction: `You are a strict educational quiz generator. 
            CORE RULE: Generate exactly ${count} multiple-choice questions based on the content.
            CORE RULE: Each question MUST have EXACTLY FOUR distinct options.
            Response format: JSON array of objects.
            JSON Schema: Array<{ "question": string, "options": string[], "correctIndex": number }>`
        });

        const prompt = `Generate a 4-option multiple-choice quiz for "${title}". Resource Content: ${content.substring(0, 5000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
            let parsedQuiz = JSON.parse(text);
            if (!Array.isArray(parsedQuiz)) {
                const firstKey = Object.keys(parsedQuiz)[0];
                if (Array.isArray(parsedQuiz[firstKey])) {
                    parsedQuiz = parsedQuiz[firstKey];
                }
            }
            return parsedQuiz.slice(0, count);
        } catch (e) {
            log(`[AI] JSON Parse Fail: ${text.substring(0, 100)}...`, "ai");
            throw new Error("Invalid AI structure received");
        }
    } catch (error) {
        log(`AI quiz generation error: ${error}`, "ai");
        const fallbackCount = options?.count || 5;
        return Array(fallbackCount).fill(null).map((_, i) => ({
            question: `Concept Question ${i + 1} for "${title}"?`,
            options: ["Core Definition", "Common Application", "Practical Case", "Further Study"],
            correctIndex: 0
        }));
    }
}
