// Simple test for gemini-pro model
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAKZZG-wLV3qa58tog9Q9ubdgjj1jKfNPA';
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiPro() {
    try {
        console.log('Testing gemini-pro model...');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello in one sentence');
        const response = await result.response;
        const text = response.text();
        console.log('✅ SUCCESS! Response:', text);
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        console.log('Full error:', error);
    }
}

testGeminiPro();
