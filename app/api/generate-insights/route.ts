import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInsights } from '@/lib/ai'

// Create Supabase client with service role for server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        // Fetch recent donations (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: recentDonations, error: donationsError } = await supabase
            .from('donations')
            .select('*')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(100)

        if (donationsError) {
            throw new Error(`Failed to fetch donations: ${donationsError.message}`)
        }

        // Calculate acceptance rates by area
        const acceptanceRates: Record<string, number> = {}
        const areaCounts: Record<string, { total: number; accepted: number }> = {}

        for (const donation of recentDonations || []) {
            const area = donation.pickup_address?.split(',')[0] || 'Unknown'

            if (!areaCounts[area]) {
                areaCounts[area] = { total: 0, accepted: 0 }
            }

            areaCounts[area].total++
            if (donation.status === 'accepted' || donation.status === 'completed') {
                areaCounts[area].accepted++
            }
        }

        for (const [area, counts] of Object.entries(areaCounts)) {
            acceptanceRates[area] = counts.total > 0 ? counts.accepted / counts.total : 0
        }

        // Get popular areas (sorted by number of donations)
        const popularAreas = Object.entries(areaCounts)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([area]) => area)

        // Generate AI insights
        const insightMessages = await generateInsights({
            recentDonations: recentDonations || [],
            acceptanceRates,
            popularAreas,
        })

        // Store insights in database
        const insightsToInsert = insightMessages.map((message, index) => ({
            title: `Insight ${index + 1}`,
            message,
            insight_type: 'general',
            created_at: new Date().toISOString(),
        }))

        // Delete old insights (keep only last 10)
        const { data: existingInsights } = await supabase
            .from('ai_insights')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(100)

        if (existingInsights && existingInsights.length > 10) {
            const idsToDelete = existingInsights.slice(10).map(i => i.id)
            await supabase
                .from('ai_insights')
                .delete()
                .in('id', idsToDelete)
        }

        // Insert new insights
        const { error: insertError } = await supabase
            .from('ai_insights')
            .insert(insightsToInsert)

        if (insertError) {
            throw new Error(`Failed to store insights: ${insertError.message}`)
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${insightMessages.length} insights`,
            insights: insightMessages,
        })
    } catch (error: any) {
        console.error('Insights generation API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate insights' },
            { status: 500 }
        )
    }
}
