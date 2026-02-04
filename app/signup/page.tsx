'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, getCurrentLocation } from '@/lib/geolocation'
import Link from 'next/link'
import type { UserRole } from '@/types/database'

export default function SignupPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'donor' as UserRole,
        phone: '',
        address: '',
        organizationName: '',
        welfareId: '',
    })
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleNext = () => {
        if (step === 1 && (!formData.email || !formData.password || !formData.fullName)) {
            setError('Please fill in all required fields')
            return
        }
        setError('')
        setStep(step + 1)
    }

    const handleGetCurrentLocation = async () => {
        setLoading(true)
        try {
            const loc = await getCurrentLocation()
            setLocation({ latitude: loc.latitude, longitude: loc.longitude })
            if (loc.address) {
                setFormData({ ...formData, address: loc.address })
            }
            setError('')
        } catch (err: any) {
            setError('Failed to get location. Please enter address manually.')
        } finally {
            setLoading(false)
        }
    }

    const handleGeocodeAddress = async () => {
        if (!formData.address) {
            setError('Please enter an address')
            return
        }
        setLoading(true)
        try {
            const loc = await geocodeAddress(formData.address + ', Karachi, Pakistan')
            if (loc) {
                setLocation({ latitude: loc.latitude, longitude: loc.longitude })
                setError('')
            } else {
                setError('Could not find location. Please try a different address.')
            }
        } catch (err) {
            setError('Failed to geocode address')
        } finally {
            setLoading(false)
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!location) {
            setError('Please set your location')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Sign up user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            })

            if (signUpError) throw signUpError

            if (authData.user) {
                // Create profile
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.fullName,
                    role: formData.role,
                    phone: formData.phone || null,
                    address: formData.address,
                    city: 'Karachi',
                    latitude: location.latitude,
                    longitude: location.longitude,
                    organization_name: formData.role === 'acceptor' ? formData.organizationName : null,
                    welfare_id: formData.role === 'acceptor' ? formData.welfareId : null,
                    is_verified: formData.role === 'donor', // Auto-verify donors
                })

                if (profileError) throw profileError

                // Redirect to dashboard
                router.push(`/${formData.role}`)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl animate-fade-in">
                <div className="text-6xl mb-4 text-center filter drop-shadow-[0_0_10px_var(--primary-glow)]">
                    🍲
                </div>
                <h2 className="text-3xl font-bold mb-2 text-center">Join the Mission</h2>
                <p className="text-gray-400 mb-8 text-center">
                    Help reduce food waste in Karachi
                </p>

                {/* Progress Indicator */}
                <div className="flex justify-center mb-8 gap-2">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-2 w-16 rounded-full transition-all ${s <= step ? 'bg-[#00d1b2]' : 'bg-white/20'
                                }`}
                        />
                    ))}
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    {step === 1 && (
                        <>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="input-glass"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-glass"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password (min 6 characters)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-glass"
                                required
                                minLength={6}
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number (optional)"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input-glass"
                            />
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">I am a:</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="input-glass"
                                >
                                    <option value="donor">Donor (Individual/Restaurant)</option>
                                    <option value="acceptor">Acceptor (Welfare/NGO)</option>
                                </select>
                            </div>

                            {formData.role === 'acceptor' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Organization Name"
                                        value={formData.organizationName}
                                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                        className="input-glass"
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Welfare ID (for verification)"
                                        value={formData.welfareId}
                                        onChange={(e) => setFormData({ ...formData, welfareId: e.target.value })}
                                        className="input-glass"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Note: Your account will be verified by admin before you can accept donations
                                    </p>
                                </>
                            )}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">Your Location in Karachi:</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter your address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="input-glass flex-1"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGeocodeAddress}
                                        disabled={loading}
                                        className="btn-primary px-4 whitespace-nowrap"
                                    >
                                        Find
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGetCurrentLocation}
                                disabled={loading}
                                className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all"
                            >
                                📍 Use Current Location
                            </button>

                            {location && (
                                <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-sm">
                                    ✓ Location set: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all"
                            >
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex-1 btn-primary"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading || !location}
                                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        )}
                    </div>
                </form>

                <p className="mt-6 text-sm text-gray-400 text-center">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#ffdd57] hover:underline font-semibold">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
