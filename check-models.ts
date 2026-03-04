import { GoogleGenerativeAI } from "@google/generative-ai";
import "./server/env.js";

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return;

    // The SDK doesn't always expose listModels clearly in the main class.
    // Let's try to fetch it manually via the API or use a known list.
    console.log("Checking model availability for key...");

    const genAI = new GoogleGenerativeAI(key);
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-pro-vision",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro"
    ];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("ping");
            console.log(`✅ ${modelName} works!`);
        } catch (e) {
            console.log(`❌ ${modelName} failed: ${e.message}`);
        }
    }
}

listModels();
