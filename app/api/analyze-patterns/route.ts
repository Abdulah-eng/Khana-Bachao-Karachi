import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeUserBehavior } from '@/lib/ai'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'UserID is required' }, { status: 400 })
        }

        // 1. Fetch user's acceptance history
        const { data: acceptances, error: historyError } = await supabase
            .from('donation_acceptances')
            .select(`
                *,
                donations (
                    food_name,
                    food_type,
                    quantity,
                    created_at,
                    pickup_address
                )
            `)
            .eq('acceptor_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (historyError) {
            throw new Error(`Failed to fetch history: ${historyError.message}`)
        }

        if (!acceptances || acceptances.length === 0) {
            return NextResponse.json({ message: 'No history found for analysis', skipped: true })
        }

        // 2. Prepare data for AI
        const historyData = acceptances.map(a => ({
            food: a.donations?.food_name,
            type: a.donations?.food_type,
            time: a.created_at,
            rating: a.rating,
            feedback: a.feedback
        }))

        // 3. Analyze with AI
        const analysis = await analyzeUserBehavior(historyData)

        // 4. Update user profile with inferred preferences (only if valid)
        // We map AI inferred types to our DB enum types: 'vegetarian', 'non-vegetarian', 'vegan', 'mixed'
        const validTypes = ['vegetarian', 'non-vegetarian', 'vegan', 'mixed']
        const currentPreferences = analysis.inferred_preferences
            .map(p => p.toLowerCase())
            .filter(p => validTypes.includes(p))

        if (currentPreferences.length > 0) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    preferred_food_types: currentPreferences,
                    // We could also store the summary in a metadata field if we had one
                })
                .eq('id', userId)

            if (updateError) {
                console.error('Failed to update preferences:', updateError)
            }
        }

        return NextResponse.json({
            success: true,
            analysis,
            updatedPreferences: currentPreferences
        })

    } catch (error: any) {
        console.error('Pattern analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to analyze patterns' },
            { status: 500 }
        )
    }
}
