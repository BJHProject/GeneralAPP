# Image Generation App with AI

## Overview

This Next.js application allows users to generate and edit images, and create videos using various AI models. It incorporates a credit-based system, Supabase for authentication and data persistence, and Vercel Blob for media storage. The project aims to provide a robust, scalable, and user-friendly platform for AI-powered content creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with Next.js 14+ (App Router), utilizing Radix UI primitives and shadcn/ui for components, styled with Tailwind CSS. It features a tab-based interface for different generation modes, modal authentication, and real-time UI updates. Content is categorized into "recent" (temporary) and "saved" (permanent) galleries.

**Image Detail View**: Clicking any generated image navigates to a dedicated detail page (`/image/[id]`) with glass-morphism styling. The detail view displays the full image at its proper aspect ratio, shows metadata (prompt, dimensions, model, creation date), and provides action buttons for Clone Prompt, Save, Share, Download, and Delete. A collapsible Prompt Details section reveals the full positive and negative prompts used for generation.

### Backend Architecture

The backend uses Next.js API routes, with edge runtimes for lightweight tasks and Node.js runtimes for AI generation. A unified AI client (`lib/ai-client/`) abstracts various AI providers (HuggingFace, Wavespeed, fal.ai, Gradio) with a centralized model registry, automatic retries with exponential backoff, and standardized error handling. Key API services include image generation, image editing, video generation, media ingestion (proxying AI output to Vercel Blob), and a daily cron job for temporary media cleanup. Architectural decisions include server-side proxying of AI-generated media, idempotency protection for credit charges, easy provider swapping via configuration, and robust retry strategies.

### Authentication & Authorization

Supabase Auth handles authentication via email/password and Google OAuth, with server-side session validation. Row-Level Security (RLS) in Supabase ensures users can only access their own data.

### Data Storage

The application uses Supabase (PostgreSQL) for its database, with tables for `users`, `images`, `videos`, `edited_images`, `credit_ledger`, `idempotency_keys`, and `user_sessions`. New users receive initial credits, and temporary media is managed with expiry and cleanup. Vercel Blob is used for storing generated media, organized into temporary and permanent folders, with automated cleanup for expired temporary files.

### Credit System

A server-enforced credit system dictates pricing for generations (e.g., 500 credits for image generation, 1000 for editing, 2000-3000 for video). All credit operations are atomic database transactions with pre-flight checks, an audit trail in the `credit_ledger`, and automatic refunds for failed generations. Security features include rate limiting, model whitelisting, and Zod schema validation.

### Admin Features

A password-protected admin control panel (`/admin-control`) allows app-wide toggles and user credit management. An admin dashboard (`/admin`) provides user statistics, generation counts, and activity tracking.

## External Dependencies

### Third-Party Services

1.  **Supabase**: Provides authentication and PostgreSQL database services.
2.  **Vercel Blob**: Used for storing all generated image and video media files.
3.  **Wavespeed AI**: Powers high-quality image generation and video creation.
4.  **HuggingFace**: Hosts various AI models, accessed with multiple API tokens for load distribution.
5.  **Gradio Client**: NPM package for interacting with Gradio-hosted AI models.
6.  **FAL.ai**: Utilized for elite-tier video generation.

### Development & Deployment

The project is currently hosted on **Replit**, using `pnpm` as the package manager. Development runs on port `5000`, and production deployments are configured for autoscale. Required environment variables for all services are managed via Replit Secrets.