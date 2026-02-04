'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError


            // Get user profile to determine role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single()

            if (profileError) {
                console.error('Profile error:', profileError)
                throw new Error('Could not load user profile. Please contact support.')
            }

            if (!profile || !profile.role) {
                throw new Error('User profile is incomplete. Please contact support.')
            }

            // Redirect based on role
            router.push(`/${profile.role}`)
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.message || 'Failed to login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md text-center animate-fade-in">
                <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_var(--primary-glow)]">
                    🍲
                </div>
                <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                <p className="text-gray-400 mb-8">Login to save food in Karachi</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-glass"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-glass"
                        required
                    />

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging in...' : 'Enter Platform'}
                    </button>
                </form>

                <p className="mt-6 text-sm text-gray-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-[#ffdd57] hover:underline font-semibold">
                        Create Account
                    </Link>
                </p>
            </div>
        </div>
    )
}
