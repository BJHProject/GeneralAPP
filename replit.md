# Image Generation App with AI

## Overview

This is a Next.js application that enables users to generate images, edit images, and create videos using various AI models. The application features a credit-based system for managing usage, with Supabase handling authentication and data persistence, and Vercel Blob for media storage.

## Recent Changes

### Unified AI Client Architecture (October 12, 2025)
- **Created unified AI client system** (`lib/ai-client/`) to abstract all AI providers
- **Provider adapters**: HuggingFace, Wavespeed, fal.ai, and Gradio with standardized error handling
- **Model registry**: Centralized configuration for all models with pricing, timeouts, and defaults
- **Retry logic**: Exponential backoff with automatic retries for transient failures
- **Refactored API routes**: Simplified `/api/generate`, `/api/edit-image`, and `/api/generate-video` to use unified client
- **Fixed credit ledger**: Changed `amount` column to `delta` across all insertion points for proper audit tracking
- **Code reduction**: Reduced API route complexity from ~1000+ lines to ~150 lines combined

### Replit Migration (October 11, 2025)
- Migrated project from Vercel to Replit
- Updated dev and production scripts to bind to `0.0.0.0:5000` for Replit compatibility
- Configured workflow to run development server on port 5000
- Set up deployment configuration for production (autoscale mode)
- All environment variables migrated to Replit Secrets
- Package manager: pnpm (detected from pnpm-lock.yaml)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14+ with App Router
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks (useState, useEffect) for local state
- **Client-Side Data Fetching**: Native fetch API with real-time updates via custom events

**Key Design Patterns**:
- Tab-based interface for switching between Images, Videos, and Editor modes
- Modal authentication flow for unauthenticated users
- Real-time UI updates via browser events (e.g., `window.dispatchEvent` for image generation completion)
- Separation of "recent" (temporary) and "saved" (permanent) content galleries

### Backend Architecture

**API Routes**: Next.js API routes (`/app/api/*`) with edge and Node.js runtimes
- **Edge Runtime**: For lightweight operations and middleware
- **Node.js Runtime**: For AI generation tasks requiring longer execution times (up to 180 seconds for videos)

**Key Services**:
1. **Image Generation** (`/api/generate`): Clean interface to unified AI client for image generation
2. **Image Editing** (`/api/edit-image`): Wavespeed-powered image modifications via unified client
3. **Video Generation** (`/api/generate-video`): Multi-style video generation (Lovely, Express, Express HD, Elite/Elitist)
4. **Media Ingestion** (`/api/ingest`): Server-side proxy that fetches AI-generated content and stores it in Vercel Blob
5. **Cron Jobs** (`/api/cleanup-temp`): Automated cleanup of expired temporary media (runs daily at 2 AM)

**Unified AI Client** (`lib/ai-client/`):
- **Provider Abstraction**: Single interface for HuggingFace, Wavespeed, fal.ai, and Gradio providers
- **Model Registry**: Centralized configuration mapping model IDs to providers, endpoints, and pricing
- **Automatic Retries**: Exponential backoff with configurable retry logic for transient failures
- **Error Normalization**: Standardized error codes (QUOTA_EXCEEDED, PROVIDER_ERROR, TIMEOUT, etc.)
- **Request Tracking**: Unique request IDs for debugging and observability

**Architecture Decisions**:
- **Server-Side Proxying**: AI-generated media URLs are never exposed to clients. The server fetches and re-hosts content in Vercel Blob to maintain control and prevent hotlinking.
- **Idempotency Protection**: Credit charges include idempotency keys to prevent duplicate charges on retry/refresh scenarios.
- **Provider Swapping**: Models can be moved between providers (e.g., HuggingFace to Wavespeed) via config changes only, no code changes needed.
- **Retry Strategy**: Automatic retries for rate limits (429), timeouts, and 5xx errors with intelligent backoff.

### Authentication & Authorization

**Provider**: Supabase Auth
- **Methods**: Email/password and Google OAuth
- **Session Management**: Server-side session validation via Supabase SSR
- **Middleware**: Automatic session refresh on each request

**Row-Level Security (RLS)**:
- All database tables enforce user_id-based policies
- Users can only access their own generated content
- Admin endpoints protected by separate password authentication

### Data Storage

**Database**: Supabase (PostgreSQL)

**Tables**:
1. **users**: User profiles with credit balances
   - `id` (references auth.users)
   - `email`, `credits`, `membership_tier`, `total_generations`
   
2. **images**: Generated images metadata
   - `user_id`, `url`, `prompt`, `width`, `height`, `is_saved`, `created_at`
   
3. **videos**: Generated videos metadata
   - `user_id`, `url`, `prompt`, `duration_seconds`, `is_saved`, `created_at`
   
4. **edited_images**: Edited image pairs
   - `user_id`, `input_image_url`, `output_image_url`, `prompt`, `is_saved`, `created_at`
   
5. **credit_ledger**: Transaction history for auditing
   - `user_id`, `amount`, `operation_type`, `description`, `metadata`, `created_at`
   
6. **idempotency_keys**: Prevents duplicate charges
   - `user_id`, `idempotency_key`, `created_at`
   
7. **user_sessions**: Login tracking and analytics
   - `user_id`, `email`, `provider`, `ip_address`, `user_agent`, `logged_in_at`
   
8. **media**: Unified media storage metadata (optional/future)
   - `user_id`, `status` (temp/saved), `storage_key`, `mime_type`, `size_bytes`, `expires_at`

**Data Lifecycle**:
- New users receive 3000 free credits on signup
- Temporary media (unsaved generations) limited to last 10 items per user
- Temporary media auto-expires after 24 hours and is deleted by cron job
- Saved media persists indefinitely

**Storage**: Vercel Blob
- **Structure**: `/temp/{userId}/{uuid}.{ext}` and `/permanent/{userId}/{uuid}.{ext}`
- **Access Control**: Public URLs with obscure paths (no sensitive data in URLs)
- **Cleanup**: Automated removal of expired temp files via cron job

### Credit System

**Pricing**:
- Image Generation: 500 credits
- Image Editing: 1000 credits  
- Video (3 seconds): 2000 credits
- Video (5 seconds): 3000 credits

**Implementation**:
- Server-enforced pricing (client cannot manipulate costs)
- Atomic database transactions for credit deduction
- Pre-flight credit checks before expensive operations
- Full audit trail in `credit_ledger` table

**Credit Operations** (`/lib/credits.ts`):
- `chargeCredits()`: Atomically deduct credits with balance validation
- `ensureUserExists()`: Create user record with initial 3000 credits on first generation
- `checkIdempotency()`: Prevent duplicate charges
- `getUserCredits()`: Fetch current balance

### Admin Features

**Admin Control Panel** (`/admin-control`):
- Password-protected access (hardcoded: "admin123")
- App-wide enable/disable toggle
- Credit management for users
- No user management UI (handled via Supabase dashboard)

**Admin Dashboard** (`/admin`):
- User statistics and analytics
- Generation counts and activity tracking
- Session logs with IP and user agent tracking

## External Dependencies

### Third-Party Services

1. **Supabase** (Authentication & Database)
   - Required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Uses: User authentication, database, row-level security

2. **Vercel Blob** (Media Storage)
   - Required environment variables: `BLOB_READ_WRITE_TOKEN`
   - Uses: Storing generated images and videos

3. **Wavespeed AI** (Image Generation & Editing)
   - Required environment variables: `WAVESPEED_API_KEY`
   - Endpoints: `/api/v3/wavespeed-ai/*` for various models
   - Uses: High-quality image generation and video creation

4. **HuggingFace** (AI Model Hosting)
   - Required environment variables: `HUGGINGFACE_API_TOKEN`, `HUGGINGFACE_API_TOKEN_2`, `HUGGINGFACE_API_TOKEN_3`
   - Uses: Multiple tokens for rate limit distribution
   - Endpoints: Gradio Spaces and HuggingFace Router API

5. **Gradio Client** (AI Model Interface)
   - NPM package: `@gradio/client`
   - Uses: Connecting to Gradio-hosted AI models

6. **FAL.ai** (Video Generation)
   - NPM package: `@fal-ai/client`
   - Uses: Elite-tier video generation

### API Integrations

**AI Model Providers**:
- **Gradio Spaces**: Community-hosted models (e.g., `aiqtech/NSFW-Real`, `dhead/WaiNSFWIllustrious_V130`)
- **Wavespeed**: Commercial API for fast inference with various models
- **HuggingFace Router**: Load-balanced endpoints for popular models
- **FAL.ai**: High-quality video generation service

**Integration Pattern**:
- Multiple fallback tokens for HuggingFace to handle rate limiting
- Provider-specific request/response formats abstracted in route handlers
- Polling-based status checking for async operations (Wavespeed, FAL.ai)

### Development & Deployment

**Current Platform**: Replit
- **Package Manager**: pnpm
- **Development**: Next.js dev server on port 5000 (binds to 0.0.0.0 for Replit compatibility)
- **Production**: Autoscale deployment with `next build` and `next start`
- **Workflow**: Server workflow runs `pnpm run dev` and waits for port 5000
- **Note**: Cron jobs from Vercel need to be handled separately if needed

**Previous Platform**: Vercel
- **Features Used**: Serverless functions, edge middleware, cron jobs, blob storage
- **Configuration**: Custom cron schedule in `vercel.json` (no longer active on Replit)

**Analytics**: Vercel Analytics
- NPM package: `@vercel/analytics`

**Environment Variables Required** (All stored in Replit Secrets):
```
NEXT_PUBLIC_SUPABASE_URL (should be https://your-project.supabase.co format)
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BLOB_READ_WRITE_TOKEN
WAVESPEED_API_TOKEN
WAVESPEED_API_TOKEN_2 (optional)
WAVESPEED_API_TOKEN_3 (optional)
HUGGINGFACE_API_TOKEN
HUGGINGFACE_API_TOKEN_2 (optional)
HUGGINGFACE_API_TOKEN_3 (optional)
```