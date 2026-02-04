export type UserRole = 'donor' | 'acceptor' | 'admin'
export type DonationStatus = 'available' | 'accepted' | 'completed' | 'cancelled'
export type FoodType = 'vegetarian' | 'non-vegetarian' | 'vegan' | 'mixed'

export interface Profile {
    id: string
    email: string
    full_name: string
    role: UserRole
    phone?: string
    address?: string
    city?: string
    latitude?: number
    longitude?: number
    organization_name?: string
    welfare_id?: string
    is_verified: boolean
    green_points: number
    preferred_food_types?: FoodType[]
    avatar_url?: string
    created_at: string
    updated_at: string
}

export interface Donation {
    id: string
    donor_id: string
    food_name: string
    food_type: FoodType
    quantity: string
    description?: string
    pickup_address: string
    latitude: number
    longitude: number
    available_from: string
    available_until: string
    ai_quality_score?: number
    ai_category?: string
    ai_expiry_prediction?: string
    image_url?: string
    status: DonationStatus
    created_at: string
    updated_at: string
    // Joined data
    donor?: Profile
    distance_km?: number
}

export interface DonationAcceptance {
    id: string
    donation_id: string
    acceptor_id: string
    distance_km?: number
    accepted_at: string
    completed_at?: string
    rating?: number
    feedback?: string
    created_at: string
    // Joined data
    donation?: Donation
    acceptor?: Profile
}

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    type: string
    donation_id?: string
    is_read: boolean
    created_at: string
    // Joined data
    donation?: Donation
}

export interface AIInsight {
    id: string
    insight_type: string
    title: string
    message: string
    data?: Record<string, any>
    valid_from: string
    valid_until?: string
    is_active: boolean
    created_at: string
}

export interface AdminLog {
    id: string
    admin_id?: string
    action: string
    target_user_id?: string
    details?: Record<string, any>
    created_at: string
}

export interface Location {
    latitude: number
    longitude: number
    address?: string
}

export interface AIAnalysisResult {
    quality_score: number
    category: string
    expiry_prediction?: Date
    description: string
    suggestions: string[]
}
