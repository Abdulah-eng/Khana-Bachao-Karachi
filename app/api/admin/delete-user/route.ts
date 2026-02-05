import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { userId, requestingUserId } = await request.json()

        if (!userId || !requestingUserId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Verify the requesting user is an admin
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', requestingUserId)
            .single()

        if (profileError || requesterProfile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin privileges required' },
                { status: 403 }
            )
        }

        // Delete user from Supabase Auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteAuthError) {
            throw new Error(`Failed to delete user from Auth: ${deleteAuthError.message}`)
        }

        // Explicitly delete from profiles table (in case cascade isn't set up or fails)
        const { error: deleteProfileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (deleteProfileError) {
            console.warn(`Failed to delete profile for user ${userId}, it might have been cascaded or already gone: ${deleteProfileError.message}`)
        }

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        })
    } catch (error: any) {
        console.error('Delete user API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        )
    }
}
