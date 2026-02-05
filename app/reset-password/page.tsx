'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Check if we have a session (handled by auth callback or client auto-detect)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // If no session, check if we have a hash fragment with access_token (implicit flow fallback)
                // But mostly we rely on the server-side callback setting the cookie

                // If strictly no session, redirect to login with error
                // router.push('/login?error=no_session_for_reset')
            }
        }
        checkSession()
    }, [supabase, router])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' })
            return
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({ password })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'Password updated successfully! Redirecting to login...'
            })

            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.message || 'Failed to update password.'
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
                <h2 className="text-3xl font-bold mb-2">Set New Password</h2>
                <p className="text-gray-400 mb-8">Enter your new secure password</p>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-glass pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                            {showPassword ? (
                                <EyeOff size={20} />
                            ) : (
                                <Eye size={20} />
                            )}
                        </button>
                    </div>

                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
