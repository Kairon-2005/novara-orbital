# Novara

Bilingual platform for Chinese students navigating Singapore's education system.

**Team:** Cyber Grape | **Programme:** NUS Orbital 2026 | **Level:** Apollo 11

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Qwen API (roadmap generation, translation, gap analysis)
- **Email:** SendGrid
- **Deployment:** Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for required keys.

## Project Structure

```
src/
├── app/          # Pages + API routes (Next.js App Router)
├── components/   # React components
├── db/           # SQL schema, RLS policies, seed data
├── lib/          # AI client, email, utilities
└── types/        # TypeScript interfaces
```
