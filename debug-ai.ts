import { GoogleGenerativeAI } from "@google/generative-ai";
import "./server/env.js"; // This should load .env

async function test() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Key defined:", !!key);
    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);
    try {
        console.log("Testing gemini-1.5-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Hello");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Pro failed:", e.message);
        try {
            console.log("Testing gemini-pro...");
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello");
            console.log("Response:", result.response.text());
        } catch (e2) {
            console.error("Pro legacy failed:", e2.message);
        }
    }
}

test();
