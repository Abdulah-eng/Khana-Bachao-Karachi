import { NextRequest, NextResponse } from 'next/server'
import { analyzeFoodImage } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const { imageBase64 } = await request.json()

        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return NextResponse.json(
                { error: 'Image data is required' },
                { status: 400 }
            )
        }

        // Analyze the image using AI
        const analysis = await analyzeFoodImage(imageBase64)

        return NextResponse.json({ analysis })
    } catch (error: any) {
        console.error('Image analysis API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to analyze image' },
            { status: 500 }
        )
    }
}
