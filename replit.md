# Image Generation App with AI

## Overview

This Next.js application allows users to generate and edit images, and create videos using various AI models. It incorporates a credit-based system, Supabase for authentication and data persistence, and Vercel Blob for media storage. The project aims to provide a robust, scalable, and user-friendly platform for AI-powered content creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with Next.js 14+ (App Router), utilizing Radix UI primitives and shadcn/ui for components, styled with Tailwind CSS. It features a tab-based interface for different generation modes, modal authentication, and real-time UI updates. Content is categorized into "recent" (temporary) and "saved" (permanent) galleries.

**Global Header**: A persistent navigation header renders on every page via the root layout, displaying the Sexify.app logo, Home link, user authentication status, credit balance, and user menu with gallery access and sign-out options.

**Generation Buttons**: All generation action buttons (Image, Video, Editor) display credit costs inline with the action label using consistent formatting: "Generate [Type] (X,XXX credits ◇)" with a white diamond icon. This provides immediate cost transparency without requiring separate cost displays.

**Past Generations Gallery**: Displays up to 20 recent **unsaved** images chronologically in fixed 2:3 aspect ratio frames with custom action icons always visible at the bottom right of each image. All images use object-contain positioning with blurry colorful backgrounds (using the image's own colors with 60px blur at 60% opacity) to elegantly fill empty space for non-portrait images. The heart icon (white outline for unsaved, pink filled for saved, turns pink on hover) allows quick saving to the permanent gallery. When an image is saved, it immediately disappears from Past Generations and moves to the Saved Images Gallery. The resize icon (28px × 28px) enables fullscreen viewing. Icons use transparent backgrounds and are 30% smaller than original size for cleaner appearance.

**Saved Images Gallery**: Displays all saved images permanently (no limit) using the same 2:3 aspect ratio frames with blurry backgrounds as Past Generations, ensuring consistent presentation across all galleries. Saved images persist indefinitely and are never automatically deleted, even when new images are generated.

**Image Detail View**: Clicking any generated image navigates to a dedicated detail page (`/image/[id]`) with a sidebar layout optimized for 1080p desktop displays. Desktop layout features a 420px left sidebar with prompts, metadata, and action buttons, with the image displayed on the right side. The image includes a resize button (28px × 28px) at the bottom right corner for fullscreen viewing on both desktop and mobile. Mobile layout stacks vertically with sidebar shown below the image.

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