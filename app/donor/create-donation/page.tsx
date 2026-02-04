'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FoodType } from '@/types/database'
import Link from 'next/link'

export default function CreateDonationPage() {
    const [formData, setFormData] = useState({
        foodName: '',
        foodType: 'vegetarian' as FoodType,
        quantity: '',
        description: '',
        pickupAddress: '',
        availableUntil: '',
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [aiAnalysis, setAiAnalysis] = useState<any>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Analyze image with AI via API endpoint
        setAnalyzing(true)
        try {
            const base64 = await fileToBase64(file)
            const imageBase64 = base64.split(',')[1] // Remove data:image/jpeg;base64, prefix

            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageBase64 }),
            })

            if (!response.ok) {
                throw new Error('Failed to analyze image')
            }

            const { analysis } = await response.json()
            setAiAnalysis(analysis)

            // Auto-fill some fields based on AI analysis
            if (analysis.category && !formData.foodName) {
                setFormData(prev => ({ ...prev, foodName: analysis.category }))
            }
        } catch (err) {
            console.error('AI analysis failed:', err)
        } finally {
            setAnalyzing(false)
        }
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get user's location from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('latitude, longitude, address')
                .eq('id', user.id)
                .single()

            if (!profile?.latitude || !profile?.longitude) {
                throw new Error('Location not set in profile')
            }

            // Upload image if present
            let imageUrl = null
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${user.id}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('donation-images')
                    .upload(fileName, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw new Error(`Failed to upload image: ${uploadError.message}`)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('donation-images')
                    .getPublicUrl(fileName)

                imageUrl = publicUrl
            }

            // Create donation
            const { error: insertError } = await supabase.from('donations').insert({
                donor_id: user.id,
                food_name: formData.foodName,
                food_type: formData.foodType,
                quantity: formData.quantity,
                description: formData.description,
                pickup_address: formData.pickupAddress || profile.address,
                latitude: profile.latitude,
                longitude: profile.longitude,
                available_until: new Date(formData.availableUntil).toISOString(),
                ai_quality_score: aiAnalysis?.quality_score,
                ai_category: aiAnalysis?.category,
                ai_expiry_prediction: aiAnalysis?.expiry_prediction?.toISOString(),
                image_url: imageUrl,
            })

            if (insertError) throw insertError

            // Success! Redirect to dashboard
            router.push('/donor')
        } catch (err: any) {
            setError(err.message || 'Failed to create donation')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/donor" className="text-[#00d1b2] hover:underline mb-4 inline-block">
                    ← Back to Dashboard
                </Link>

                <div className="glass-card">
                    <h2 className="text-3xl font-bold mb-2">Post a New Donation</h2>
                    <p className="text-gray-400 mb-8">Help avoid food wastage in your neighborhood</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Food Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="input-glass"
                            />
                            {imagePreview && (
                                <div className="mt-4">
                                    <img src={imagePreview} alt="Preview" className="rounded-lg max-h-64 mx-auto" />
                                    {analyzing && (
                                        <p className="text-center mt-2 text-[#00d1b2]">🤖 AI analyzing image...</p>
                                    )}
                                    {aiAnalysis && (
                                        <div className="mt-4 bg-[#00d1b2]/10 border border-[#00d1b2] rounded-lg p-4">
                                            <p className="font-semibold text-[#00d1b2] mb-2">AI Analysis:</p>
                                            <p className="text-sm">Quality Score: {(aiAnalysis.quality_score * 100).toFixed(0)}%</p>
                                            <p className="text-sm">Category: {aiAnalysis.category}</p>
                                            <p className="text-sm text-gray-400 mt-2">{aiAnalysis.description}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Food Item Name *</label>
                            <input
                                type="text"
                                placeholder="e.g., 5kg Chicken Biryani"
                                value={formData.foodName}
                                onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
                                className="input-glass"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Food Type *</label>
                            <select
                                value={formData.foodType}
                                onChange={(e) => setFormData({ ...formData, foodType: e.target.value as FoodType })}
                                className="input-glass"
                            >
                                <option value="vegetarian">Vegetarian</option>
                                <option value="non-vegetarian">Non-Vegetarian</option>
                                <option value="vegan">Vegan</option>
                                <option value="mixed">Mixed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Quantity *</label>
                            <input
                                type="text"
                                placeholder="e.g., 5kg or Serves 10 people"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="input-glass"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                placeholder="Additional details about the food..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-glass min-h-24"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Pickup Address</label>
                            <input
                                type="text"
                                placeholder="Leave blank to use your profile address"
                                value={formData.pickupAddress}
                                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                                className="input-glass"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Available Until *</label>
                            <input
                                type="datetime-local"
                                value={formData.availableUntil}
                                onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                                className="input-glass"
                                required
                            />
                        </div>

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
                            {loading ? 'Submitting...' : 'Submit & Earn Points'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
