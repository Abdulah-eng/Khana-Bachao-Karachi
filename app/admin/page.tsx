'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Donation } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

export default function AdminDashboard() {
    const [users, setUsers] = useState<Profile[]>([])
    const [donations, setDonations] = useState<Donation[]>([])
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDonors: 0,
        totalAcceptors: 0,
        pendingVerification: 0,
        totalDonations: 0,
        activeDonations: 0,
    })
    const [loading, setLoading] = useState(true)
    const [generatingInsights, setGeneratingInsights] = useState(false)
    const [insightsMessage, setInsightsMessage] = useState('')
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

            // Check if admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Profile error:', profileError)
                router.push('/login')
                return
            }

            if (profile?.role !== 'admin') {
                alert('Access denied. Admin privileges required.')
                router.push('/login')
                return
            }

            // Load users
            const { data: usersData } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (usersData) {
                setUsers(usersData)
                setStats({
                    totalUsers: usersData.length,
                    totalDonors: usersData.filter(u => u.role === 'donor').length,
                    totalAcceptors: usersData.filter(u => u.role === 'acceptor').length,
                    pendingVerification: usersData.filter(u => u.role === 'acceptor' && !u.is_verified).length,
                    totalDonations: 0,
                    activeDonations: 0,
                })
            }

            // Load donations
            const { data: donationsData } = await supabase
                .from('donations')
                .select('*, donor:profiles!donor_id(*)')
                .order('created_at', { ascending: false })
                .limit(20)

            if (donationsData) {
                setDonations(donationsData)
                setStats(prev => ({
                    ...prev,
                    totalDonations: donationsData.length,
                    activeDonations: donationsData.filter(d => d.status === 'available').length,
                }))
            }
        } catch (error) {
            console.error('Error loading data:', error)
            alert('Error loading admin dashboard. Check console for details.')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: true })
                .eq('id', userId)

            if (error) throw error

            await loadData()
            alert('User verified successfully!')
        } catch (error: any) {
            alert(error.message || 'Failed to verify user')
        }
    }

    const handleGenerateInsights = async () => {
        setGeneratingInsights(true)
        setInsightsMessage('')

        try {
            const response = await fetch('/api/generate-insights', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate insights')
            }

            setInsightsMessage(`✅ ${data.message}`)
            setTimeout(() => setInsightsMessage(''), 5000)
        } catch (error: any) {
            setInsightsMessage(`❌ ${error.message}`)
            setTimeout(() => setInsightsMessage(''), 5000)
        } finally {
            setGeneratingInsights(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    requestingUserId: user.id
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user')
            }

            alert('User deleted successfully')
            loadData() // Refresh list
        } catch (error: any) {
            console.error('Delete error:', error)
            alert(error.message || 'Failed to delete user')
        }
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
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">
                            System <span className="text-[#ffdd57]">Administrator</span>
                        </h1>
                        <p className="text-gray-400 mt-2">Khana-Bachao Karachi Platform</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl transition-all"
                    >
                        Logout
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-[#00d1b2]">{stats.totalUsers}</div>
                        <div className="text-sm text-gray-400 mt-1">Total Users</div>
                    </div>
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-blue-400">{stats.totalDonors}</div>
                        <div className="text-sm text-gray-400 mt-1">Donors</div>
                    </div>
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-purple-400">{stats.totalAcceptors}</div>
                        <div className="text-sm text-gray-400 mt-1">Acceptors</div>
                    </div>
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-yellow-400">{stats.pendingVerification}</div>
                        <div className="text-sm text-gray-400 mt-1">Pending</div>
                    </div>
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-green-400">{stats.totalDonations}</div>
                        <div className="text-sm text-gray-400 mt-1">Donations</div>
                    </div>
                    <div className="glass-card text-center">
                        <div className="text-3xl font-bold text-orange-400">{stats.activeDonations}</div>
                        <div className="text-sm text-gray-400 mt-1">Active</div>
                    </div>
                </div>

                {/* AI Insights Generation */}
                <div className="glass-card mb-8 border-l-4 border-[#00d1b2]">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold">🤖 AI Insights Generator</h3>
                            <p className="text-sm text-gray-400 mt-2">
                                Generate AI-powered insights based on recent donation patterns and trends
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateInsights}
                            disabled={generatingInsights}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingInsights ? 'Generating...' : 'Generate Insights'}
                        </button>
                    </div>
                    {insightsMessage && (
                        <div className={`mt-4 p-4 rounded-lg ${insightsMessage.startsWith('✅')
                            ? 'bg-green-500/20 border border-green-500 text-green-400'
                            : 'bg-red-500/20 border border-red-500 text-red-400'
                            }`}>
                            {insightsMessage}
                        </div>
                    )}
                </div>

                {/* Pending Verifications */}
                {stats.pendingVerification > 0 && (
                    <div className="glass-card mb-8 border-l-4 border-yellow-400">
                        <h3 className="text-2xl font-bold mb-6">⚠️ Pending NGO Verifications</h3>
                        <div className="space-y-4">
                            {users
                                .filter(u => u.role === 'acceptor' && !u.is_verified)
                                .map((user) => (
                                    <div
                                        key={user.id}
                                        className="bg-white/5 rounded-xl p-5 flex justify-between items-center"
                                    >
                                        <div>
                                            <h4 className="font-bold text-lg">{user.organization_name}</h4>
                                            <p className="text-sm text-gray-400 mt-1">{user.full_name} • {user.email}</p>
                                            {user.welfare_id && (
                                                <p className="text-sm text-gray-300 mt-1">Welfare ID: {user.welfare_id}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                Registered {formatRelativeTime(user.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleVerifyUser(user.id)}
                                            className="btn-primary"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Recent Donations */}
                <div className="glass-card mb-8">
                    <h3 className="text-2xl font-bold mb-6">Recent Donations</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4">Food</th>
                                    <th className="text-left py-3 px-4">Donor</th>
                                    <th className="text-left py-3 px-4">Type</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donations.map((donation) => (
                                    <tr key={donation.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <div className="font-semibold">{donation.food_name}</div>
                                            <div className="text-sm text-gray-400">{donation.quantity}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm">{donation.donor?.full_name}</td>
                                        <td className="py-3 px-4 text-sm">{donation.food_type}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${donation.status === 'available'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : donation.status === 'accepted'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    }`}
                                            >
                                                {donation.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-400">
                                            {formatRelativeTime(donation.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* All Users */}
                <div className="glass-card">
                    <h3 className="text-2xl font-bold mb-6">All Users</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4">Name</th>
                                    <th className="text-left py-3 px-4">Email</th>
                                    <th className="text-left py-3 px-4">Role</th>
                                    <th className="text-left py-3 px-4">Verified</th>
                                    <th className="text-left py-3 px-4">Joined</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <div className="font-semibold">{user.full_name}</div>
                                            {user.organization_name && (
                                                <div className="text-sm text-gray-400">{user.organization_name}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'donor'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : user.role === 'acceptor'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            {user.is_verified ? '✓ Yes' : '✗ No'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-400">
                                            {formatRelativeTime(user.created_at)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
