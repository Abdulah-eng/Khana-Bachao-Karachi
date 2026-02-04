import { NextRequest, NextResponse } from 'next/server'
import { generateChatbotResponse } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const { message, context } = await request.json()

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            )
        }

        const response = await generateChatbotResponse(message, context)

        return NextResponse.json({ response })
    } catch (error: any) {
        console.error('Chatbot API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        )
    }
}
