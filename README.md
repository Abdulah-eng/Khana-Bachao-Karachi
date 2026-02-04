# Khana-Bachao Karachi - Food Donation Platform

A comprehensive food donation platform built with Next.js 15 and Supabase, connecting food donors with welfare organizations in Karachi to reduce food waste.

## Features

- **Three User Roles**: Donors, Acceptors (NGOs), and Admins
- **Geolocation-Based Matching**: Automatically notify nearby acceptors when food is donated
- **AI-Powered Features**:
  - Food quality assessment from images
  - Smart donation matching
  - Demand pattern insights
  - Interactive chatbot assistant
- **Real-time Notifications**: Instant updates using Supabase Realtime
- **Premium UI**: Glassmorphism design with smooth animations
- **Mobile Responsive**: Works seamlessly on all devices

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism theme
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Maps**: OpenStreetMap with Leaflet.js (free, no API key needed)
- **AI**: Google Gemini API for image analysis and insights
- **Geolocation**: PostGIS for spatial queries, Nominatim for geocoding

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Google Gemini API key (free tier available)

## Setup Instructions

### 1. Clone and Install

```bash
cd "d:\\projects\\food project\\food-donation-app"
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the entire `supabase-schema.sql` file
3. This will create:
   - All tables with PostGIS extension
   - Row Level Security policies
   - Triggers for notifications
   - Functions for geolocation matching

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. Fill in your credentials in `.env.local`:

```env
# Get these from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Get from Google AI Studio: https://makersuite.google.com/app/apikey
GOOGLE_GEMINI_API_KEY=your-gemini-api-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_DISTANCE_KM=10

# Admin Email (for initial admin user)
ADMIN_EMAIL=admin@fooddonation.com
```

### 4. Create Admin User (Optional)

After running the SQL schema, you can manually create an admin user:

1. Sign up through the app as a donor
2. In Supabase Dashboard > Table Editor > profiles
3. Find your user and change `role` to `admin`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
food-donation-app/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── donor/             # Donor dashboard
│   ├── acceptor/          # Acceptor dashboard
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── maps/             # Map components
│   └── chatbot/          # AI chatbot
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── geolocation.ts    # Location utilities
│   ├── ai.ts             # AI functions
│   └── utils.ts          # General utilities
├── types/                 # TypeScript types
└── supabase-schema.sql   # Database schema
```

## User Workflows

### Donor Workflow
1. Sign up as donor with location
2. Create food donation alert
3. Upload food image (AI analyzes quality)
4. Nearby acceptors get notified automatically
5. Track donation status
6. Earn green points

### Acceptor Workflow
1. Sign up as acceptor/NGO with location
2. Wait for admin verification
3. Receive real-time notifications for nearby donations
4. View donations on map sorted by distance
5. Accept donations
6. Provide feedback

### Admin Workflow
1. Monitor all users and donations
2. Verify NGO/acceptor accounts
3. View analytics and insights
4. Manage system settings

## Database Schema

Key tables:
- `profiles` - User profiles with role and location
- `donations` - Food donation listings with geolocation
- `donation_acceptances` - Tracking accepted donations
- `notifications` - Real-time notifications
- `ai_insights` - AI-generated insights
- `admin_logs` - Admin activity tracking

See `supabase-schema.sql` for complete schema.

## AI Features

### Food Image Analysis
- Quality score (0-1)
- Food categorization
- Expiry prediction
- Storage suggestions

### Insights Generation
- Demand patterns by area
- Acceptance rate trends
- Optimal donation times
- Popular food types

### Chatbot
- Answers questions about the platform
- Helps with registration
- Provides NGO verification info
- Coverage area information

## Geolocation Features

- **Distance Calculation**: Haversine formula for accurate distances
- **Geocoding**: Convert addresses to coordinates using Nominatim
- **Reverse Geocoding**: Get address from coordinates
- **Spatial Queries**: PostGIS for efficient nearby searches
- **Auto-Notification**: Notify acceptors within 10km radius

## Real-time Features

Using Supabase Realtime:
- Instant donation notifications
- Live donation status updates
- Real-time chat (chatbot)
- Dashboard auto-refresh

## Deployment

### Deploy to Vercel

```bash
npm run build
# Deploy to Vercel
```

Make sure to add all environment variables in Vercel dashboard.

### Database Migrations

For production, use Supabase migrations:
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize
supabase init

# Create migration from schema
supabase db diff -f initial_schema

# Push to production
supabase db push
```

## Troubleshooting

### Location not working
- Ensure HTTPS in production (geolocation requires secure context)
- Check browser permissions
- Verify Nominatim API is accessible

### AI not working
- Verify GOOGLE_GEMINI_API_KEY is set correctly
- Check API quota limits
- Ensure image is base64 encoded

### Notifications not appearing
- Check Supabase Realtime is enabled
- Verify RLS policies allow reading notifications
- Check browser console for errors

## Contributing

This is a project for Karachi food donation. Contributions welcome!

## License

MIT

## Support

For issues or questions, please check the code comments or create an issue.
