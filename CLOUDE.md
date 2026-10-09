Project Context

This project is a modern SaaS application built with:

    Next.js (Frontend)

    React

    TypeScript

    TailwindCSS

    Node.js + Express (Backend API)

    Prisma ORM

    Supabase / PostgreSQL (Database)

    Vercel (Hosting & Deployment)

The application must be scalable, secure, responsive, and production-ready.
Tech Stack Rules
💻 Frontend

    Use Next.js App Router

    Use React Server Components when possible

    Use TypeScript strictly

    Use TailwindCSS for styling

    Use reusable UI components

    Prefer clean SaaS UI patterns

    Support dark mode

    Maintain responsive layouts

    Rule: Never attempt to connect the frontend directly to the database. All data operations must go through the Backend API endpoints or Supabase client via secure HTTPS requests.

 Backend (API & Database)
Node.js + Express + Prisma + Supabase/PostgreSQL

Use this stack for:

    Custom JWT Authentication & Session Handling

    PostgreSQL/Supabase database management via Prisma ORM

    Realtime features using WebSockets (Socket.io) or Server-Sent Events (SSE)

    Local File Storage or S3-compatible API integration

    Route-level Authentication and Authorization Middlewares (replacing RLS)

Rules:

    Always use Middleware Authentication: Protect private routes using custom JWT validation.

    Role-Based Access Control (RBAC): Implement strict authorization middlewares (authorize('Admin', 'Gerente')) to restrict administrative operations.

    Never expose database credentials or JWT_SECRET keys.

    Use secure API practices (validate req.body, req.query, and req.params).

    Create normalized PostgreSQL database schemas.

    Use Prisma Migrations consistently (npx prisma migrate dev).

    Optimize database queries to prevent N+1 issues and handle connections efficiently using the Prisma connection pool.

 Deployment Rules
Vercel & Supabase (Serverless)

Deploy is fully serverless via Vercel, with Supabase providing database, auth, and storage. No Docker containers, no Nginx reverse proxy, and no self-managed servers.

Requirements:

    Deployment: Push to the main branch triggers an automatic build and deploy on Vercel.

    Environment Variables: Configure secrets and connection strings via the Vercel project dashboard, never committed to the repo.

    Security: TLS/SSL is handled automatically by Vercel's edge network.

    Static assets and caching are managed by Vercel's CDN; no manual cache configuration needed.

    Database access, auth, and RLS policies are managed through Supabase.

 Authentication

Requirements:

    Secure login and signup flows implemented entirely on the backend using bcryptjs for password hashing.

    Token-based session handling using secure, short-lived JWTs.

    Protected frontend routes based on auth context and backend verification tokens.

    Secure role-based access control (RBAC) enforced at the API layer.

    Secure password reset flow utilizing server-side token generation.

 SaaS Architecture

The project should support:

    User accounts & Profiles

    Subscription plans & Billing system

    Admin dashboard & User dashboard

    Analytics & Audit logs

    Notifications (Realtime badge updates using SSE/WebSockets)

    Settings management

    API integrations

    Multi-tenant structure if needed

 UI/UX Rules

    Modern SaaS design

    Minimal and professional interface

    Consistent spacing and typography

    Responsive on:

        Mobile

        Tablet

        Desktop

    Use loading states and skeleton loaders when appropriate

    Prioritize usability and accessibility

 Security Rules

Always protect against:

    XSS & CSRF

    SQL Injection (prevented natively by Prisma parameterized queries)

    Unauthorized access & Privilege escalation

    API abuse & Brute force (implement rate-limiting where necessary)

Requirements:

    Validate all inputs using schema validators (e.g., Zod).

    Sanitize data before database persistence.

    Never trust frontend validation only. Always double-check permissions on the backend.

    Keep all secrets, database URLs, and private keys strictly in server environment variables.

 Performance Rules

    Optimize images and use lazy loading.

    Reduce unnecessary React re-renders.

    Cache heavy database queries or API responses when appropriate.

    Optimize database indexes on frequently queried columns (Foreign keys, filter fields).

    Keep production bundle sizes small and clean up unused dependencies.

 Code Quality

    Write clean, modular, and maintainable code.

    Avoid duplicated logic; isolate controller functions and prisma services.

    Keep Express route files organized and components small.

    Use async/await properly with robust try/catch error handling block patterns.

    Avoid the use of any in TypeScript.

 API Rules

    Use a clean RESTful API architecture.

    Handle server errors gracefully and return consistent JSON error payloads.

    Use proper HTTP status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error).

    Protect all private endpoints with the authenticate middleware.

 Database Rules (PostgreSQL/Supabase)

    Use PostgreSQL best practices.

    Add indexes where necessary for optimal search performance.

    Avoid N+1 queries by using Prisma's include or select wisely.

    Use foreign keys correctly to maintain referential integrity.

    Keep schemas scalable and backward-compatible.

 AI Assistant Instructions

When generating code for this project:

    Always generate production-ready code.

    Follow modern Node.js/Express and Next.js SaaS best practices.

    Prefer scalable, clean, and modular backend/frontend architectures.

    Use Prisma Client correctly for all database operations.

    Optimize code for serverless deployment on Vercel (no long-running process assumptions).

    Avoid unnecessary production dependencies.

 Forbidden

    Do not expose database strings or JWT_SECRET keys in the code.

    Do not connect the frontend client directly to the database (except via Supabase client).

    Do not create routes without explicit authorization checks if they handle private user data.

    Do not generate insecure authentication or save plain text passwords.

    Do not create bloated components or messy router files.

    Do not introduce Docker, Nginx, or other self-hosted server infrastructure — deployment is Vercel + Supabase only.