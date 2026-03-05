import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "./index";

export async function generateStudySchedule(tasks: any[], subjects: any[]) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

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
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

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
            model: "models/gemini-1.5-flash",
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

export async function generateQuiz(content: string, title: string) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder-key");
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

        const prompt = `
            Based on the following study resource titled "${title}", generate a quiz.
            Return exactly 5 multiple choice questions in a JSON array.
            Each object must have: "question", "options" (array of 4 strings), and "correctIndex" (0-3).
            
            Content:
            ${content.substring(0, 5000)}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Invalid AI quiz format");
    } catch (error) {
        log(`AI quiz generation error: ${error}`, "ai");

        // Graceful Fallback
        return [
            {
                question: `What is the primary focus of "${title}"?`,
                options: ["Option A", "The central thesis of the text", "Option C", "Option D"],
                correctIndex: 1
            },
            {
                question: `"AI Generation Unavailable: Fallback Question 2"`,
                options: ["A", "B", "C", "D"],
                correctIndex: 0
            },
            {
                question: `"AI Generation Unavailable: Fallback Question 3"`,
                options: ["A", "B", "C", "D"],
                correctIndex: 2
            },
            {
                question: `"AI Generation Unavailable: Fallback Question 4"`,
                options: ["A", "B", "C", "D"],
                correctIndex: 3
            },
            {
                question: `"AI Generation Unavailable: Fallback Question 5"`,
                options: ["A", "B", "C", "D"],
                correctIndex: 1
            }
        ];
    }
}
