// Test the improved chatbot with different questions
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAKZZG-wLV3qa58tog9Q9ubdgjj1jKfNPA';
const genAI = new GoogleGenerativeAI(apiKey);

async function testChatbot(question) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are a helpful AI assistant for a food donation platform in Karachi, Pakistan.

PLATFORM INFORMATION:
- Name: Food Donation Platform
- Purpose: Connects food donors (individuals, restaurants, caterers) with verified NGOs and welfare organizations
- Coverage: All areas across Karachi, Pakistan
- Features: AI-powered food quality analysis, real-time matching, Green Points rewards, NGO verification system

KEY FEATURES:
1. DONOR FEATURES:
   - Register and create donation listings with photos
   - AI analyzes food quality and suggests expiry times
   - Get matched with nearby verified NGOs (within 10km)
   - Earn Green Points for successful donations
   - Track donation history and impact

2. NGO/ACCEPTOR FEATURES:
   - Verified organizations can browse available donations
   - Accept donations based on their needs
   - Real-time notifications for new donations in their area
   - Must be verified by admin to ensure legitimacy

3. GREEN POINTS SYSTEM:
   - Earn points for each successful donation
   - Higher quality food = more points
   - Points visible on donor dashboard
   - Encourages consistent donations

4. REGISTRATION:
   - Donors: Sign up with email, create profile, start donating
   - NGOs: Sign up, submit verification documents, wait for admin approval

5. COVERAGE AREAS:
   - All major areas in Karachi including DHA, Gulshan, Clifton, Saddar, North Nazimabad, etc.
   - Maximum matching distance: 10km for convenient pickup

USER QUESTION: "${question}"

INSTRUCTIONS: Answer the user's specific question based on the platform information above. Be concise (2-3 sentences), friendly, and directly address what they asked. Don't give generic responses - tailor your answer to their exact question.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

async function runTests() {
    const questions = [
        "What is this platform about?",
        "How do I register as a donor?",
        "What are Green Points?",
        "Which areas do you cover?",
        "How does NGO verification work?"
    ];

    console.log('Testing improved chatbot with different questions:\n');

    for (const question of questions) {
        console.log(`Q: ${question}`);
        const answer = await testChatbot(question);
        console.log(`A: ${answer}\n`);
    }
}

runTests();
