const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load env vars
// Note: In a real app we'd use dotenv, but here we'll just paste the key for the test or expect it in env
// For this test script to work, we need the API key. I will look at .env.local again or assume the user runs it with env.
// Based on previous file view, I have the key.
const API_KEY = 'AIzaSyBuu33PvZl-YWF7dyasZdQJvB-rioBx0_Q';

const genAI = new GoogleGenerativeAI(API_KEY);

async function analyzeUserBehavior(history) {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            }
        });

        const prompt = `Analyze this user's donation acceptance history and infer their preferences and behavior patterns.

User History: ${JSON.stringify(history)}

Provide:
1. A brief summary of their behavior (e.g., "Prefers vegetarian food, mostly active on weekends").
2. Inferred food preferences (list of categories like "vegetarian", "non-vegetarian", "vegan", "cooked meals", "raw ingredients").
3. Suggested actions or notifications (e.g., "Notify for large veg donations").

IMPORTANT: Respond ONLY with a valid JSON object.
Format:
{
  "summary": "User prefers vegetarian food...",
  "inferred_preferences": ["vegetarian", "vegan"],
  "suggested_actions": ["Notify for veg food", "Suggest weekend pickups"]
}`;

        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Raw Response:", text);

        return JSON.parse(text);

    } catch (error) {
        console.error('User analysis error:', error);
        return null;
    }
}

// Mock History Data
const mockHistory = [
    { food: "Vegetable Biryani", type: "vegetarian", time: "2023-10-01T18:00:00Z", rating: 5 },
    { food: "Daal Chawal", type: "vegetarian", time: "2023-10-02T19:30:00Z", rating: 4 },
    { food: "Mixed Veg Curry", type: "vegetarian", time: "2023-10-05T18:15:00Z", rating: 5 },
    { food: "Chicken Rice", type: "non-vegetarian", time: "2023-10-10T12:00:00Z", rating: 3, feedback: "Keep it separate" }
];

async function runTest() {
    console.log("Testing Pattern Analysis...");
    const result = await analyzeUserBehavior(mockHistory);

    if (result) {
        console.log("\n✅ Analysis Result:");
        console.log(JSON.stringify(result, null, 2));

        // Basic assertions
        if (result.inferred_preferences.includes('vegetarian')) {
            console.log("✅ Correctly inferred vegetarian preference.");
        } else {
            console.log("❌ Failed to infer vegetarian preference.");
        }
    } else {
        console.log("❌ Test Failed.");
    }
}

runTest();
