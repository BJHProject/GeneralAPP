# Image Generation App with AI

## Overview
This Next.js application provides AI-powered image generation, editing, and video creation capabilities. It features a credit-based usage system, secure authentication and data persistence via Supabase, and utilizes Vercel Blob for efficient media storage. The project aims to offer a robust and scalable platform for creative AI tasks, focusing on user experience, security, and developer-friendly architecture.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses Next.js 14+ with the App Router, Radix UI primitives, shadcn/ui for components, and Tailwind CSS for styling. It employs React hooks for state management and native fetch API for client-side data fetching. Key design patterns include a tab-based interface, modal authentication, real-time UI updates, and separate galleries for "recent" and "saved" content.

### Backend Architecture
Next.js API routes handle backend logic, utilizing edge and Node.js runtimes. Core services include Image Generation, Image Editing, Video Generation, Media Ingestion (proxying AI-generated content to Vercel Blob), and Cron Jobs for cleanup. A unified AI client abstracts various AI providers (HuggingFace, Wavespeed, fal.ai, Gradio) with a centralized model registry, automatic retries, and standardized error handling. Architectural decisions include server-side proxying of media, idempotency protection for credit charges, easy provider swapping via configuration, and an intelligent retry strategy.

### Authentication & Authorization
Supabase Auth is used for authentication, supporting email/password and Google OAuth, with server-side session management. Row-Level Security (RLS) in Supabase ensures users can only access their own data.

### Data Storage
Supabase (PostgreSQL) is the primary database, storing user profiles, generated images, videos, edited images, credit ledger entries, idempotency keys, and user sessions. Vercel Blob is used for media storage, organizing files into temporary and permanent categories with automated cleanup for temporary assets. New users receive initial credits, and temporary media is automatically expired and deleted.

### Credit System
A server-enforced credit system governs usage, with atomic database transactions for deductions, pre-flight checks, and automatic refunds for failed generations. All transactions are recorded in an append-only `credit_ledger` for auditing. Security measures include rate limiting, model whitelisting, and Zod schema validation for requests.

### Admin Features
An admin control panel allows app-wide toggles and credit management for users. An admin dashboard provides user statistics, generation counts, and activity tracking.

## External Dependencies

### Third-Party Services
1.  **Supabase**: Authentication, Database (PostgreSQL), and Row-Level Security.
2.  **Vercel Blob**: Media storage for generated images and videos.
3.  **Wavespeed AI**: Image generation and editing.
4.  **HuggingFace**: AI model hosting and inference.
5.  **Gradio Client**: Interface for Gradio-hosted AI models.
6.  **FAL.ai**: Elite-tier video generation.

### Development & Deployment
The project is hosted on Replit, using pnpm as the package manager. Development runs on `0.0.0.0:5000`, and production deployments leverage Replit's autoscale feature.