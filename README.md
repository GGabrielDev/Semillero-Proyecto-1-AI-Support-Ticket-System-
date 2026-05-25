# AI Support Ticket System

A full-stack support ticket platform built with Next.js 14, Supabase, TypeScript, Tailwind CSS, and a swappable AI provider layer.

## Features
- Email/password authentication with Supabase Auth
- Dashboard with ticket metrics and recent activity
- Ticket CRUD API routes with Zod validation
- AI-powered ticket analysis and reply suggestions
- Supabase SQL migrations, RLS policies, and seed instructions
- Deployment config for Vercel and Render

## Tech Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- AI SDK + Google Generative AI or llama-server

## Getting Started
1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Run Supabase migrations in `supabase/migrations`.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.

## Environment Variables
See `.env.example` for the required configuration.
