'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AIChatbot } from '@/components/chatbot/AIChatbot'
import { calculateDistance } from '@/lib/geolocation'
import type { Profile, Donation } from '@/types/database'
import { formatRelativeTime, getTimeUntil } from '@/lib/utils'

export default function AcceptorDashboard() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [nearbyDonations, setNearbyDonations] = useState<(Donation & { distance_km?: number })[]>([])
    const [acceptedDonations, setAcceptedDonations] = useState<Donation[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        loadData()

        // Subscribe to new donations
        const channel = supabase
            .channel('donations')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, () => {
                loadData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
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

                // Load nearby available donations
                const { data: donationsData } = await supabase
                    .from('donations')
                    .select('*, donor:profiles!donor_id(*)')
                    .eq('status', 'available')
                    .gte('available_until', new Date().toISOString())

                if (donationsData && profileData.latitude && profileData.longitude) {
                    // Calculate distances and sort
                    const withDistances = donationsData.map(donation => ({
                        ...donation,
                        distance_km: calculateDistance(
                            { latitude: profileData.latitude!, longitude: profileData.longitude! },
                            { latitude: donation.latitude, longitude: donation.longitude }
                        )
                    })).filter(d => d.distance_km! <= 10) // Within 10km
                        .sort((a, b) => a.distance_km! - b.distance_km!)

                    setNearbyDonations(withDistances)
                }

                // Load accepted donations
                const { data: acceptedData } = await supabase
                    .from('donation_acceptances')
                    .select('*, donation:donations(*)')
                    .eq('acceptor_id', user.id)
                    .order('accepted_at', { ascending: false })

                if (acceptedData) {
                    setAcceptedDonations(acceptedData.map(a => a.donation).filter(Boolean))
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const [acceptingId, setAcceptingId] = useState<string | null>(null)

    const handleAcceptDonation = async (donationId: string, distance: number) => {
        if (acceptingId) return // Prevent multiple clicks

        setAcceptingId(donationId)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Check if already accepted
            const { data: existing } = await supabase
                .from('donation_acceptances')
                .select('id')
                .eq('donation_id', donationId)
                .single()

            if (existing) {
                alert('This donation has already been accepted!')
                setAcceptingId(null)
                await loadData()
                return
            }

            // Create acceptance
            const { error: acceptError } = await supabase
                .from('donation_acceptances')
                .insert({
                    donation_id: donationId,
                    acceptor_id: user.id,
                    distance_km: distance,
                })

            if (acceptError) throw acceptError

            // Update donation status to accepted
            const { error: updateError } = await supabase
                .from('donations')
                .update({ status: 'accepted' })
                .eq('id', donationId)

            if (updateError) throw updateError

            // Award green points to donor
            const { data: donation } = await supabase
                .from('donations')
                .select('donor_id')
                .eq('id', donationId)
                .single()

            if (donation) {
                // Get current points
                const { data: donorProfile } = await supabase
                    .from('profiles')
                    .select('green_points')
                    .eq('id', donation.donor_id)
                    .single()

                if (donorProfile) {
                    // Update points
                    await supabase
                        .from('profiles')
                        .update({ green_points: (donorProfile.green_points || 0) + 100 })
                        .eq('id', donation.donor_id)
                }
            }

            // Reload data
            await loadData()
            alert('Donation accepted! Pickup details are shown below.')
        } catch (error: any) {
            console.error('Accept error:', error)
            alert(error.message || 'Failed to accept donation')
        } finally {
            setAcceptingId(null)
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

    if (!profile?.is_verified) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card max-w-2xl text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-3xl font-bold mb-4">Account Pending Verification</h2>
                    <p className="text-gray-400 mb-6">
                        Your NGO/Welfare organization account is being verified by our admin team.
                        You'll be able to accept donations once verified.
                    </p>
                    <button onClick={handleLogout} className="btn-primary">
                        Logout
                    </button>
                </div>
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
                            Welfare Dashboard <span className="text-[#ffdd57]">Karachi</span>
                        </h1>
                        <p className="text-gray-400 mt-2">{profile?.organization_name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl transition-all"
                    >
                        Logout
                    </button>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="glass-card">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">📍</div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Nearby Donations</h3>
                                <p className="text-gray-400 text-sm">{nearbyDonations.length} available within 10km</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">✅</div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Accepted</h3>
                                <p className="text-gray-400 text-sm">{acceptedDonations.length} donations accepted</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nearby Donations */}
                <div className="glass-card mb-8">
                    <h3 className="text-2xl font-bold mb-6">Available Donations Nearby</h3>
                    {nearbyDonations.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-lg">No donations available nearby at the moment</p>
                            <p className="text-sm mt-2">You'll be notified when new donations are posted</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {nearbyDonations.map((donation) => (
                                <div
                                    key={donation.id}
                                    className="bg-white/5 rounded-xl p-5 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-bold text-lg">{donation.food_name}</h4>
                                                <span className="text-[#00d1b2] text-sm font-semibold">
                                                    {donation.distance_km?.toFixed(1)}km away
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {donation.quantity} • {donation.food_type}
                                            </p>
                                            {donation.description && (
                                                <p className="text-sm text-gray-300 mt-2">{donation.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                Available for: {getTimeUntil(donation.available_until)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Posted {formatRelativeTime(donation.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleAcceptDonation(donation.id, donation.distance_km!)}
                                            disabled={acceptingId === donation.id}
                                            className="btn-primary ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {acceptingId === donation.id ? 'Accepting...' : 'Accept'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Accepted Donations */}
                {acceptedDonations.length > 0 && (
                    <div className="glass-card">
                        <h3 className="text-2xl font-bold mb-6">Your Accepted Donations</h3>
                        <div className="space-y-4">
                            {acceptedDonations.map((donation) => (
                                <div
                                    key={donation.id}
                                    className="bg-white/5 rounded-xl p-5"
                                >
                                    <h4 className="font-bold text-lg">{donation.food_name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {donation.quantity} • {donation.food_type}
                                    </p>
                                    <p className="text-sm text-gray-300 mt-2">
                                        📍 {donation.pickup_address}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Chatbot */}
            <AIChatbot />
        </div>
    )
}
