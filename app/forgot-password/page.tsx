'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'Password reset instructions have been sent to your email.'
            })
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.message || 'Failed to send reset email.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md text-center animate-fade-in">
                <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_var(--primary-glow)]">
                    🔐
                </div>
                <h2 className="text-3xl font-bold mb-2">Reset Password</h2>
                <p className="text-gray-400 mb-8">Enter your email to receive reset instructions</p>

                <form onSubmit={handleReset} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-glass"
                        required
                    />

                    {message && (
                        <div className={`rounded-lg p-3 text-sm ${message.type === 'success'
                            ? 'bg-green-500/20 border border-green-500 text-green-400'
                            : 'bg-red-500/20 border border-red-500 text-red-500'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="mt-6 text-sm text-gray-400">
                    Remember your password?{' '}
                    <Link href="/login" className="text-[#ffdd57] hover:underline font-semibold">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    )
}
