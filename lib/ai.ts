import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIAnalysisResult } from '@/types/database'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

/**
 * Analyze food image using Google Gemini Vision API
 */
export async function analyzeFoodImage(
    imageBase64: string
): Promise<AIAnalysisResult> {
    try {
        // Use gemini-2.5-flash for image analysis (supports multimodal, better quota than 2.5-pro)
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            }
        })

        const prompt = `Analyze this food image and provide:
1. Quality score (0.0 to 1.0) - assess freshness and condition
2. Food category (e.g., "Rice Dish", "Bread", "Vegetables", "Meat", etc.)
3. Estimated expiry time in hours from now (if visible indicators suggest it)
4. Brief description of the food
5. Suggestions for storage or handling

IMPORTANT: Respond ONLY with a valid JSON object.
Format:
{
  "quality_score": 0.85,
  "category": "Rice Dish",
  "expiry_hours": 24,
  "description": "Fresh biryani with visible rice grains and meat pieces",
  "suggestions": ["Store in refrigerator", "Consume within 24 hours", "Reheat before serving"]
}`

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                },
            },
        ])

        const response = await result.response
        const text = response.text()
        console.log('AI Raw Response:', text) // Debug log

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()

        // Parse JSON from response
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error(`Failed to parse AI response: ${text.substring(0, 100)}...`)
        }

        const parsed = JSON.parse(jsonMatch[0])

        // Calculate expiry prediction
        let expiry_prediction: Date | undefined
        if (parsed.expiry_hours) {
            expiry_prediction = new Date()
            expiry_prediction.setHours(expiry_prediction.getHours() + parsed.expiry_hours)
        }

        return {
            quality_score: parsed.quality_score || 0.7,
            category: parsed.category || 'Food',
            expiry_prediction,
            description: parsed.description || 'Food item',
            suggestions: parsed.suggestions || [],
        }
    } catch (error) {
        console.error('AI analysis error:', error)
        // Return default values if AI fails
        return {
            quality_score: 0.7,
            category: 'Food',
            description: 'Unable to analyze image',
            suggestions: ['Store properly', 'Check expiry date'],
        }
    }
}

/**
 * Generate AI insights based on donation patterns
 */
export async function generateInsights(data: {
    recentDonations: any[]
    acceptanceRates: Record<string, number>
    popularAreas: string[]
}): Promise<string[]> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `Based on the following food donation data, generate 3-5 actionable insights for donors and acceptors in Karachi:

Recent Donations: ${JSON.stringify(data.recentDonations.slice(0, 10))}
Acceptance Rates by Area: ${JSON.stringify(data.acceptanceRates)}
Popular Areas: ${JSON.stringify(data.popularAreas)}

Provide insights like:
- High demand patterns (time, location, food type)
- Acceptance rate trends
- Recommendations for donors
- Tips for better distribution

IMPORTANT: Respond ONLY with a valid JSON array of strings. Do not wrap it in markdown code blocks.
Example return: ["insight 1", "insight 2", ...]`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()

        const jsonMatch = cleanText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        return [
            'High demand for vegetarian food in Gulshan area',
            'Evening donations (6-8 PM) have 2x higher acceptance rates',
            'NGOs in DHA respond faster than other areas',
        ]
    } catch (error) {
        console.error('Insight generation error:', error)
        return [
            'Check recent donation patterns for optimal timing',
            'Consider food preferences in your area',
        ]
    }
}

/**
 * Generate chatbot response
 */
export async function generateChatbotResponse(
    userMessage: string,
    context?: string
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

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

${context ? `Additional Context: ${context}` : ''}

USER QUESTION: "${userMessage}"

INSTRUCTIONS: Answer the user's specific question based on the platform information above. Be concise (2-3 sentences), friendly, and directly address what they asked. Don't give generic responses - tailor your answer to their exact question.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
    } catch (error) {
        console.error('Chatbot error:', error)
        return "I'm having trouble processing your request right now. Please try asking about registration, NGO verification, or coverage areas in Karachi."
    }
}
