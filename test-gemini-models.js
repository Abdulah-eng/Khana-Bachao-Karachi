// Quick test script to check available Gemini models
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || 'AIzaSyAKZZG-wLV3qa58tog9Q9ubdgjj1jKfNPA';
const genAI = new GoogleGenerativeAI(apiKey);

async function testModels() {
    const modelsToTest = [
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest',
    ];

    console.log('Testing Gemini models with your API key...\n');

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say "Hello"');
            const response = await result.response;
            const text = response.text();
            console.log(`✅ ${modelName} - WORKS! Response: ${text.substring(0, 50)}...\n`);
        } catch (error) {
            console.log(`❌ ${modelName} - FAILED: ${error.message}\n`);
        }
    }
}

testModels().catch(console.error);
