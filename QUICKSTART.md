# Quick Start Guide - Food Donation Platform

## What You Have

A complete Next.js + Supabase food donation platform with:

✅ **Three User Roles**: Donor, Acceptor (NGO), Admin
✅ **AI Features**: Food image analysis, chatbot, demand insights
✅ **Geolocation**: Distance-based matching with OpenStreetMap
✅ **Real-time**: Instant notifications via Supabase
✅ **Premium UI**: Glassmorphism design from your original code

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd "d:\projects\food project\food-donation-app"
npm install
```

### 2. Set Up Supabase
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your project URL and anon key from Settings > API
3. Go to SQL Editor and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to create all tables, functions, and triggers

### 3. Configure Environment
```bash
copy .env.example .env.local
```

Edit `.env.local` and add:
- Your Supabase URL and keys (from step 2)
- Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey) (free)

### 4. Run the App
```bash
npm run dev
```

Open http://localhost:3000

### 5. Test It Out

**As Donor:**
1. Sign up → Choose "Donor"
2. Set your location
3. Create a donation (upload food image for AI analysis!)
4. See green points awarded

**As Acceptor:**
1. Sign up → Choose "Acceptor"  
2. Provide organization name
3. Get verified by admin
4. See nearby donations sorted by distance
5. Accept a donation

**As Admin:**
1. Sign up as donor first
2. In Supabase Dashboard → Table Editor → profiles
3. Change your user's `role` to `admin`
4. Refresh and login again
5. Verify NGO accounts, monitor donations

## Key Files

- **Database**: `supabase-schema.sql` - Run this in Supabase SQL Editor
- **Environment**: `.env.example` - Copy to `.env.local` and fill in
- **Documentation**: `README.md` - Full setup guide
- **Walkthrough**: See artifacts for detailed walkthrough

## AI Features Included

1. **Food Image Analysis** - Upload food photo, AI assesses quality, category, expiry
2. **AI Chatbot** - Floating widget (bottom-right) answers questions
3. **Demand Insights** - Shows patterns like "High demand for Biryani in Lyari"

## Geolocation Features

- Uses **OpenStreetMap** (free, no API key needed)
- Calculates distances with Haversine formula
- Auto-notifies acceptors within 10km
- Sorts donations by distance

## Real-time Features

- New donations appear instantly for acceptors
- Donation status updates in real-time
- Notifications via database triggers

## What's Next?

1. **Test locally** with the steps above
2. **Create Supabase Storage bucket** named `donation-images` for food photos
3. **Deploy to Vercel** when ready
4. **Add more features** from the implementation plan

## Need Help?

Check `README.md` for detailed documentation and troubleshooting.

---

**Built with**: Next.js 15, Supabase, Google Gemini AI, OpenStreetMap, Tailwind CSS
