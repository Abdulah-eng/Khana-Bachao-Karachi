// Test gemini-2.5-flash model
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAKZZG-wLV3qa58tog9Q9ubdgjj1jKfNPA';
const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini25() {
    try {
        console.log('Testing gemini-2.5-flash model...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Say hello in one sentence');
        const response = await result.response;
        const text = response.text();
        console.log('✅ SUCCESS! Response:', text);
        return true;
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        return false;
    }
}

testGemini25();
