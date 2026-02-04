'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AIChatbot } from '@/components/chatbot/AIChatbot'
import type { Profile, Donation, AIInsight } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

export default function DonorDashboard() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [donations, setDonations] = useState<Donation[]>([])
    const [insights, setInsights] = useState<AIInsight[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Load profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileData) {
                setProfile(profileData)
            }

            // Load donations
            const { data: donationsData } = await supabase
                .from('donations')
                .select('*')
                .eq('donor_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (donationsData) {
                setDonations(donationsData)
            }

            // Load AI insights
            const { data: insightsData } = await supabase
                .from('ai_insights')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(3)

            if (insightsData) {
                setInsights(insightsData)
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">
                            Khana-Bachao <span className="text-[#ffdd57]">Karachi</span>
                        </h1>
                        <p className="text-gray-400 mt-2">Welcome back, {profile?.full_name}!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="glass-card px-6 py-3 m-0">
                            ⭐ <span className="font-bold text-[#ffdd57]">{profile?.green_points || 0}</span> Green Points
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Link href="/donor/create-donation">
                        <div className="glass-card hover:scale-105 cursor-pointer transition-all">
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">🍲</div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Post New Donation</h3>
                                    <p className="text-gray-400 text-sm">Share food and earn points</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <div className="glass-card">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">📊</div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Your Impact</h3>
                                <p className="text-gray-400 text-sm">{donations.length} donations made</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                {insights.length > 0 && (
                    <div className="glass-card mb-8 border-l-4 border-[#ffdd57]">
                        <h3 className="text-xl font-bold mb-4">🤖 AI Insights</h3>
                        <div className="space-y-3">
                            {insights.map((insight) => (
                                <div key={insight.id} className="bg-white/5 rounded-lg p-4">
                                    <p className="font-semibold text-[#00d1b2]">{insight.title}</p>
                                    <p className="text-sm text-gray-300 mt-1">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Donations */}
                <div className="glass-card">
                    <h3 className="text-2xl font-bold mb-6">Your Recent Donations</h3>
                    {donations.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-lg mb-4">No donations yet</p>
                            <Link href="/donor/create-donation">
                                <button className="btn-primary">Create Your First Donation</button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {donations.map((donation) => (
                                <div
                                    key={donation.id}
                                    className="bg-white/5 rounded-xl p-5 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-lg">{donation.food_name}</h4>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {donation.quantity} • {donation.food_type}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {formatRelativeTime(donation.created_at)}
                                            </p>
                                        </div>
                                        <div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${donation.status === 'available'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : donation.status === 'accepted'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : donation.status === 'completed'
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-gray-500/20 text-gray-400'
                                                    }`}
                                            >
                                                {donation.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Chatbot */}
            <AIChatbot />
        </div>
    )
}
