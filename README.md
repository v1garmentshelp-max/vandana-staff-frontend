# Vandana Mall — Frontend

React + Vite frontend for Vandana Shopping Mall Staff Manager.

## Setup (run once — for DB initialization only)
```bash
npm install
npm run db:init    # creates all tables in Neon
npm run db:seed    # loads all 84 staff members
```

## Local development
```bash
npm run dev        # http://localhost:5173
```

Make sure backend is running on http://localhost:4000

## Deploy to Vercel

1. Push this folder to GitHub
2. Import on vercel.com → New Project
3. Add environment variable:
   - Key:   VITE_API_URL
   - Value: https://your-backend-project.vercel.app
4. Deploy

## Environment variables
| Variable | Description |
|---|---|
| VITE_API_URL | Backend Vercel URL (e.g. https://vandana-backend.vercel.app) |
