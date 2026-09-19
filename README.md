# DevLog | Enterprise-Grade MERN Blog Platform

[![VAPT Hardened](https://img.shields.io/badge/Security-OWASP%20Top%2010%20Compliant-emerald?style=for-the-badge&logo=shield)](docs/security/VAPT-REPORT.md)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%7C%20Vitest%20Passed-blue?style=for-the-badge&logo=jest)](server/tests)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Layered%20Services-indigo?style=for-the-badge)](server/src/services)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

> A production-ready, security-hardened full-stack MERN blog platform developed strictly in accordance with the technical assignment requirements. Features complete user authentication, role-based access control (RBAC), post and comment management, a dedicated React admin panel, real-time WebSocket synchronization via Socket.io, advanced layered architecture, comprehensive unit/integration tests, and an OWASP VAPT audit report.

---

## 📋 Table of Contents

1. [Assignment Requirements Compliance Matrix](#-assignment-requirements-compliance-matrix)
2. [Project Deliverables & Demo Video](#-project-deliverables--demo-video)
3. [Technology Stack](#-technology-stack)
4. [System Architecture & Design](#-system-architecture--design)
5. [Monorepo Directory Structure](#-monorepo-directory-structure)
6. [Quick Start & Installation Instructions](#-quick-start--installation-instructions)
7. [Environment Setup (.env)](#-environment-setup-env)
8. [Database Execution Model](#-database-execution-model)
9. [Pre-Configured Test Accounts](#-pre-configured-test-accounts)
10. [Feature Implementations Breakdown](#-feature-implementations-breakdown)
11. [API Documentation Overview](#-api-documentation-overview)
12. [Automated Testing Suite (Jest & Vitest)](#-automated-testing-suite-jest--vitest)
13. [Security Hardening & VAPT Audit](#-security-hardening--vapt-audit)
14. [Render.com Production Deployment](#-rendercom-production-deployment)

---

## 📑 Assignment Requirements Compliance Matrix

Every core, architectural, and bonus requirement specified in the evaluation document has been fully implemented and tested:

| Requirement Category | Specified Specification | Implementation Details & Source Location | Status |
| :--- | :--- | :--- | :---: |
| **1. User Authentication** | Registration, login, and logout | JWT access tokens (15m) & rotating refresh tokens (7d) in HttpOnly cookies + Bearer fallback | ✅ Complete |
| | Password hashing | `bcryptjs` with 12 salt rounds before MongoDB persistence (`User.js`) | ✅ Complete |
| | Rate limiting for auth endpoints | `authLimiter` via `express-rate-limit` (10 req / 15 min window) | ✅ Complete |
| | Environment variables | All secrets stored in `.env` and loaded via centralized `env.js` | ✅ Complete |
| | Social media login (OAuth 2.0) | Live Google & Facebook OAuth 2.0 flows with state verification + Dev Sandbox | ✅ Complete |
| **2. Roles & Permissions** | Two user types: Admin & Regular User | Strict role schemas (`ROLES.ADMIN`, `ROLES.USER`) | ✅ Complete |
| | Admin capabilities | Manage all users, all posts, and all comments from dedicated admin panel | ✅ Complete |
| | Regular user boundaries | Create, edit, and delete **only their own** posts and comments (IDOR protected) | ✅ Complete |
| | RBAC enforcement | Server-side API middleware (`requireAuth`, `requireRole`, `requireOwnership`) | ✅ Complete |
| **3. Post Management** | CRUD operations for posts | Create, Read, Update, Delete with Title, Content, Author, and Timestamps | ✅ Complete |
| | Request payload validation | Formal `Zod` schemas validating all input lengths, formats, and tags | ✅ Complete |
| | URL-friendly slugs | `slugify` with automatic duplicate-collision avoidance suffixing (`title-1`) | ✅ Complete |
| | Database interactions | MongoDB with Mongoose ODM, strict schemas, and automated timestamps | ✅ Complete |
| | Soft deletes | Schema-level `isDeleted: true` and `deletedAt` timestamps with Admin restoration | ✅ Complete |
| **4. Comments** | User commenting on posts | Full CRUD operations for comments with parent post relationship | ✅ Complete |
| | Comment permissions | Users can edit/delete only their own comments; Admins can moderate all comments | ✅ Complete |
| | Mongoose relationships | Relational `ObjectId` references (`ref: 'Post'`, `ref: 'User'`) with query optimization | ✅ Complete |
| **5. Admin Panel** | Dedicated React Admin UI | Full admin portal (`/admin`) restricted by `AdminRoute` and `requireRole` | ✅ Complete |
| | Admin dashboard statistics | Real-time metric cards: Total users, total articles, and total comments | ✅ Complete |
| | Content & user governance | User directory (search, role toggle, status toggle), post & comment moderation | ✅ Complete |
| **6. Advanced Routing** | Logical route grouping | Express Router modularization (`routes/authRoutes`, `postRoutes`, etc.) | ✅ Complete |
| | Route protection | Layered middleware pipeline on all sensitive endpoints | ✅ Complete |
| | RESTful standards & versioning | Versioned API `/api/v1/` with standard HTTP status codes and JSON envelope | ✅ Complete |
| | Centralized error handling | Standardized `centralizedErrorHandler` interceptor with consistent JSON format | ✅ Complete |
| **7. Middleware** | Activity logging | Custom non-blocking `activityLogger` logging logins, post creation, deletion | ✅ Complete |
| | JWT validation & roles | Reusable `requireAuth`, `requireRole('ADMIN')`, and `requireOwnership` | ✅ Complete |
| **8. Services & Architecture**| Service Layer | Pure business logic decoupled from controllers (`services/*.js`) | ✅ Complete |
| | Clean folder structure | Explicit separation: `controllers/`, `services/`, `models/`, `routes/`, `middleware/` | ✅ Complete |
| **9. Performance** | MongoDB query indexing | Compound indexes `{ isDeleted: 1, createdAt: -1 }`, text search indexes | ✅ Complete |
| | Pagination & sparse population | Cursor/page pagination + `.populate('author', 'username avatar')` avoiding over-fetching | ✅ Complete |
| **10. Testing** | Unit & Integration tests | 41+ automated tests in **Jest** (backend) + **Vitest** (frontend) | ✅ Complete |
| **Frontend (React)** | Functional components & Hooks | 100% React Hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`) | ✅ Complete |
| | Global authentication state | React Context API (`AuthContext`) managing session lifecycle and persistence | ✅ Complete |
| | Protected routes | `ProtectedRoute` and `AdminRoute` guarding unauthenticated / unauthorized access | ✅ Complete |
| **Bonus (Optional)** | Real-time notifications | Real-time WebSocket event broadcasting with **Socket.io** (`new_post`, `new_comment`) | ✅ Complete |

---

## 🎥 Project Deliverables & Demo Video

1. **Source Code Repository**: Complete MERN-based source code adhering to clean architecture.
2. **Project Demonstration Video**:
   * **Master Video File**: [`DevLog_MERN_Platform_Demonstration.mp4`](./DevLog_MERN_Platform_Demonstration.mp4)
   * **Duration**: **4:35 (275 seconds)** — strictly within the required 4:00–5:00 minute demonstration window.
   * **Resolution & Audio**: 1080p Full HD (1920x1080, 30fps) with studio-grade AI narration and simulated cursor workflow.
   * **Sections Showcased**:
     1. Architecture, monorepo layout, and dual-mode database resilience.
     2. Multi-tier authentication, password complexity, and JWT token rotation.
     3. Blog post authoring, Markdown rendering, auto-slugification, and real-time feed updates.
     4. Discussion threads, comment moderation, and real-time Socket.io updates.
     5. Full administrative governance: RBAC, metrics dashboard, user management, and soft-delete restorations.
     6. IDOR prevention, rate limiting, and security boundaries.
     7. Automated testing results across Jest and Vitest.

---

## 🛠 Technology Stack

### Backend
* **Runtime**: Node.js (v18+ / v22 LTS)
* **Framework**: Express.js (v4.21)
* **Database & ODM**: MongoDB with Mongoose ODM (v8.9)
* **Real-time WebSockets**: Socket.io (v4.8)
* **Authentication**: JWT (`jsonwebtoken` v9), `bcryptjs` (12 salt rounds), `cookie-parser`
* **Validation & Security**: Zod (v3.24), Helmet (v8.0), CORS, `express-rate-limit`, custom NoSQL sanitizer
* **Logging**: Morgan HTTP logger, custom MongoDB `ActivityLog` service
* **Testing**: Jest (v29), Supertest (v7), `mongodb-memory-server` (v10)

### Frontend
* **Framework**: React 18 with Vite (v6.0)
* **Routing**: React Router DOM (v7.1)
* **State & Server Cache**: React Context API (`AuthContext`, `ThemeContext`, `SocketContext`), `@tanstack/react-query` (v5)
* **Forms & Validation**: `react-hook-form` with `@hookform/resolvers/zod`
* **Styling**: Modern CSS Design System (Glassmorphism, Dark/Light theme tokens, responsive grid)
* **Icons & Notifications**: Lucide React (`lucide-react`), React Toastify (`react-toastify`)
* **Testing**: Vitest (v2.1), React Testing Library, JSDOM

---

## 🏛 System Architecture & Design

The backend enforces a strict **Clean Layered Architecture**, separating transport logic, input validation, domain business logic, and data storage:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTTP / WebSocket Client                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Middleware Pipeline                           │
│  - Helmet (Security Headers)       - CORS (Allowed Origins & Cookies) │
│  - Rate Limiter (Brute-Force)      - NoSQL Injection Sanitizer        │
│  - Morgan Logger                   - Express JSON (10MB body limit)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Versioned Routing (/api/v1/*)                      │
│     authRoutes    │    postRoutes    │   commentRoutes  │ adminRoutes  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Input Validation & RBAC Security Layer                   │
│  - Zod Request DTO Validation     - requireAuth (JWT Token Check)     │
│  - requireRole (ADMIN vs USER)    - requireOwnership (IDOR Guard)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Controllers Layer (HTTP)                         │
│  - Extracts HTTP params & body    - Calls appropriate Service function│
│  - Returns formatted JSON responses via apiResponse helpers           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Service Layer (Business Logic)                      │
│  - authService   │   postService   │  commentService  │ adminService   │
│  * Implements token rotation, slug generation, soft-deletes, RBAC rules│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Data Access Layer (Mongoose)                      │
│  - User Model    │   Post Model    │  Comment Model   │ ActivityLog    │
│  * Compound indexing, timestamps, relational references, soft-delete   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 MongoDB Cluster / MongoMemoryServer                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Monorepo Directory Structure

```
companyvlog-assignment/
├── client/                               # Frontend Single Page Application (React 18 + Vite)
│   ├── public/
│   │   └── _redirects                    # SPA redirect rules for Render / Netlify deployments
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js                 # Resilient Fetch API client with automatic token refresh
│   │   │   └── queryClient.js            # TanStack Query client configuration
│   │   ├── components/                   # Reusable UI components
│   │   │   ├── Navbar.jsx                # Global responsive navigation with auth controls
│   │   │   ├── Footer.jsx                # Site footer
│   │   │   ├── ConfirmModal.jsx          # Portaled confirmation dialog with escape/scroll lock
│   │   │   ├── EditProfileModal.jsx      # Bio & avatar customization modal (presets + upload)
│   │   │   ├── Pagination.jsx            # Reusable page navigation
│   │   │   └── Skeleton.jsx              # Loading skeletons
│   │   ├── constants/
│   │   │   └── avatars.js                # Preset developer avatars and canvas image compressor
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # Global auth state (Context API with resilient persistence)
│   │   │   ├── ThemeContext.jsx          # Dark / Light mode toggle
│   │   │   └── SocketContext.jsx         # Real-time WebSocket connection provider
│   │   ├── hooks/
│   │   │   ├── useApi.js                 # API query keys and error extraction utilities
│   │   │   └── useBlogApi.js             # TanStack Query hooks for posts, comments, admin operations
│   │   ├── pages/
│   │   │   ├── Home.jsx                  # Public feed, tag filtering, and search
│   │   │   ├── PostDetails.jsx           # Post view, Markdown rendering, discussion thread
│   │   │   ├── CreateEditPost.jsx        # Article authoring & editing with live preview
│   │   │   ├── Login.jsx                 # Login view, OAuth 2.0 buttons, dev sandbox
│   │   │   ├── Register.jsx              # Account creation with live password complexity checklist
│   │   │   ├── Profile.jsx               # User profile, authored post list, and profile customization
│   │   │   ├── OAuthCallback.jsx         # OAuth redirect handler
│   │   │   └── admin/                    # Dedicated Admin Portal
│   │   │       ├── AdminLayout.jsx       # Admin navigation sidebar & header wrapper
│   │   │       ├── AdminDashboard.jsx    # Real-time metric cards (Users, Posts, Comments)
│   │   │       ├── UserManagement.jsx    # User directory, role promotion, status deactivation
│   │   │       ├── PostManagement.jsx    # Article moderation and soft-delete restoration
│   │   │       ├── CommentManagement.jsx # Global comment inspection and deletion
│   │   │       └── ActivityLogs.jsx      # Audit trail feed
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.jsx        # Authenticated user route guard
│   │   │   └── AdminRoute.jsx            # Administrator-only route guard
│   │   ├── styles/
│   │   │   └── index.css                 # Comprehensive CSS design system (tokens, themes, cards)
│   │   └── test/
│   │       ├── setup.js                  # Vitest environment setup
│   │       └── AuthFlow.test.jsx         # Frontend authentication unit tests
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Backend REST API & Real-time Server (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js               # Dual-mode database connector (Atlas + In-Memory)
│   │   │   └── env.js                    # Centralized environment variable loader and parser
│   │   ├── constants/
│   │   │   └── roles.js                  # Roles enum (ADMIN, USER) and activity action types
│   │   ├── controllers/                  # HTTP Transport Controllers
│   │   │   ├── authController.js         # Register, Login, Refresh, Logout, OAuth, Profile
│   │   │   ├── postController.js         # Post CRUD, slug retrieval, soft-deletes
│   │   │   ├── commentController.js      # Comment CRUD on articles
│   │   │   └── adminController.js        # User directory, stats, content restoration, audit logs
│   │   ├── middleware/                   # Reusable Modular Middleware
│   │   │   ├── auth.js                   # requireAuth (JWT token verification)
│   │   │   ├── rbac.js                   # requireRole (RBAC role checking)
│   │   │   ├── ownership.js              # requireOwnership (IDOR prevention on posts & comments)
│   │   │   ├── validate.js               # Zod request payload schema validator
│   │   │   ├── rateLimiter.js            # General API and strict Auth rate limiters
│   │   │   ├── security.js               # NoSQL injection input sanitizer
│   │   │   ├── activityLogger.js         # Non-blocking user activity auditor
│   │   │   └── errorHandler.js           # Centralized JSON error interceptor
│   │   ├── models/                       # Mongoose Schemas & ODM Models
│   │   │   ├── User.js                   # User model with bcrypt password hashing hook
│   │   │   ├── Post.js                   # Post model with soft-delete flags and compound indexes
│   │   │   ├── Comment.js                # Comment model with post-user relational references
│   │   │   ├── RefreshToken.js           # Cryptographic refresh token family model
│   │   │   └── ActivityLog.js            # Audit log model for sensitive operations
│   │   ├── routes/                       # Express Route Handlers
│   │   │   ├── index.js                  # Main API router mounting all versioned /api/v1/ endpoints
│   │   │   ├── authRoutes.js             # /api/v1/auth routes
│   │   │   ├── postRoutes.js             # /api/v1/posts routes
│   │   │   ├── commentRoutes.js          # /api/v1/comments routes
│   │   │   └── adminRoutes.js            # /api/v1/admin routes
│   │   ├── scripts/
│   │   │   ├── seed.js                   # Production seed script with demo articles and users
│   │   │   └── testEmail.js              # SMTP connection validation utility
│   │   ├── services/                     # Decoupled Business Logic Layer
│   │   │   ├── authService.js            # Credential verification, token rotation, OAuth logic
│   │   │   ├── postService.js            # Article creation, slug generation, soft-deletion
│   │   │   ├── commentService.js         # Discussion moderation and post references
│   │   │   └── adminService.js           # User status toggle, admin stats compilation
│   │   ├── utils/
│   │   │   ├── jwt.js                    # JWT access and refresh token signing/verification
│   │   │   ├── slug.js                   # URL slugification with duplicate suffix handler
│   │   │   ├── apiResponse.js            # Standardized JSON response formatting envelopes
│   │   │   └── logger.js                 # Winston-based structured logger
│   │   ├── validators/                   # Zod Request Validation Schemas
│   │   │   ├── authValidator.js          # Registration, login, profile schemas
│   │   │   ├── postValidator.js          # Post creation and update schemas
│   │   │   └── commentValidator.js       # Comment submission schemas
│   │   ├── app.js                        # Express application instance and pipeline
│   │   └── server.js                     # HTTP and Socket.io server bootstrapper
│   ├── tests/
│   │   ├── setup.js                      # Jest environment configuration
│   │   ├── unit/                         # Unit tests (Password hashing, JWT, Zod schemas)
│   │   ├── integration/                  # Integration tests (Auth, Post CRUD, Comment CRUD, RBAC)
│   │   └── security/                     # Security tests (NoSQL injection, security headers)
│   └── package.json
│
├── docs/
│   ├── security/
│   │   └── VAPT-REPORT.md                # Comprehensive OWASP Top 10 VAPT Audit Report
│   └── DEMO-SCRIPT.md                    # Structured 5-10 minute presentation script
├── render.yaml                           # Infrastructure-as-Code blueprint for Render deployments
├── package.json                          # Monorepo root workspace orchestrator
└── README.md                             # Comprehensive technical documentation
```

---

## 🚀 Quick Start & Installation Instructions

### Prerequisites
* **Node.js**: `>= 18.0.0` (Recommended: v20 LTS or v22 LTS)
* **npm**: `>= 9.0.0`

### Step 1: Clone the Repository
```bash
git clone https://github.com/soumya100/blog-assignment.git
cd blog-assignment
```

### Step 2: Install All Dependencies
Run the workspace installer from the root directory to install root, backend, and frontend packages in one command:
```bash
npm run install:all
```
*(Alternatively: run `npm install`, `npm install --prefix server`, and `npm install --prefix client`).*

### Step 3: Configure Environment Variables
Create your local environment file:
```bash
cp .env.example .env
```
*(The application is pre-configured with safe development defaults and can run immediately without modifications).*

### Step 4: Seed the Database
Populate the database with sample administrators, verified authors, technical articles, and nested discussion comments:
```bash
npm run seed
```

### Step 5: Start the Application
Run both the backend API and frontend client concurrently:
```bash
npm run dev
```

* **Frontend Client**: [http://localhost:5173](http://localhost:5173)
* **Backend API Gateway**: [http://localhost:5000](http://localhost:5000)
* **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## ⚙️ Environment Setup (.env)

The application utilizes centralized environment variable parsing via [server/src/config/env.js](server/src/config/env.js). A template is available in `.env.example`:

```env
# Application Environment & Ports
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database (Leave blank to use automatic zero-config embedded MongoMemoryServer)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/blog_platform?retryWrites=true&w=majority

# JWT Token Configuration (Cryptographically random strings in production)
JWT_ACCESS_SECRET=super_secure_access_secret_change_in_production_key_123456789
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_secure_refresh_secret_change_in_production_key_987654321
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=super_cookie_secret_change_me_in_production_34982347

# Rate Limiting Parameters
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # Max 100 requests per window on general endpoints
AUTH_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=10    # Max 10 attempts per window on login/register

# Default Seed Administrator
ADMIN_EMAIL=admin@blogplatform.dev
ADMIN_PASSWORD=AdminSecurePass123!
ADMIN_USERNAME=systemadmin

# OAuth 2.0 Credentials (Optional: Live production credentials)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/v1/auth/facebook/callback

# SMTP Email Configuration (Password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_FROM="DevLog Security" <your_email@gmail.com>
```

---

## 🗄 Database Execution Model

The system implements **Dual-Mode Database Resilience** ([server/src/config/database.js](server/src/config/database.js)):

1. **External Database Mode**: When a valid `MONGODB_URI` (such as MongoDB Atlas or a local `mongod` instance) is defined, the server connects via Mongoose with connection pooling and DNS SRV fallback.
2. **Zero-Config In-Memory Fallback**: If no `MONGODB_URI` is provided or the connection fails in development/testing, the application automatically boots an isolated embedded **`MongoMemoryServer`**.
   * Evaluators can clone and run the project immediately **without having MongoDB installed locally**.

---

## 👥 Pre-Configured Test Accounts

Running `npm run seed` generates pre-configured accounts for testing roles and security controls:

| Account Type | Email | Password | Role | Permissions & Test Scenario |
| :--- | :--- | :--- | :---: | :--- |
| **System Administrator** | `admin@blogplatform.dev` | `AdminSecurePass123!` | `ADMIN` | Complete access to `/admin`, can manage all users, edit/delete any article, restore soft-deleted posts, inspect audit logs |
| **Verified Author 1** | `alice@example.com` | `UserPass123!` | `USER` | Author of multiple seeded articles. Can edit and delete only her own posts |
| **Verified Author 2** | `bob@example.com` | `UserPass123!` | `USER` | Author of security articles. Used to verify IDOR protection when attempting to edit Alice's articles |
| **Deactivated Account** | `carol@example.com` | `UserPass123!` | `USER` | Deactivated user account. Used to verify that deactivated accounts are barred from logging in (HTTP 403) |

> **Convenience Feature**: The Login page features quick **"Demo Admin"** and **"Demo User"** buttons that auto-fill credentials for immediate evaluation.

---

## 💡 Feature Implementations Breakdown

### 1. User Authentication & Session Security
* **Password Hashing**: Pre-save Mongoose hook using `bcryptjs` with 12 salt rounds. Plaintext passwords never touch database storage.
* **Dual-Token Lifecycle**:
  * **Access Token**: 15-minute expiration, signed with `HS256`, sent via HTTP `Authorization: Bearer <token>` or signed cookie.
  * **Refresh Token**: 7-day expiration, stored in the database as SHA-256 hashes within session families.
* **Token Rotation & Replay Detection**: Every refresh operation invalidates the consumed refresh token and issues a new pair. If a revoked token is reused (indicating token theft), the entire session family for that user is immediately revoked.
* **Brute-Force Rate Limiting**: `express-rate-limit` protects `/auth/login` and `/auth/register` to prevent credential stuffing.
* **OAuth 2.0 (Google & Facebook)**: Supports live production OAuth 2.0 workflows with cryptographic state parameters against CSRF, accompanied by an interactive **OAuth Dev Sandbox** modal on the login page for offline testing.

### 2. User Roles & RBAC (Role-Based Access Control)
* Roles are enforced strictly at the **API layer** through middleware, not just on the client UI:
  * `requireAuth`: Verifies JWT authenticity, user existence, and verifies account active status.
  * `requireRole('ADMIN')`: Verifies administrative privilege; returns `403 Forbidden` for regular users.
  * `requireOwnership`: Verifies whether the requesting user is the resource author or an administrator before allowing `PATCH` or `DELETE` operations (IDOR defense).

### 3. Blog Post Management
* **Full CRUD Operations**:
  * `POST /api/v1/posts`: Create articles with Title, Content, Tags, and Author metadata.
  * `GET /api/v1/posts`: Paginated list of published articles with search and tag filtering.
  * `GET /api/v1/posts/:id`: Query article by MongoDB ObjectId or URL-friendly slug.
  * `PATCH /api/v1/posts/:id`: Edit article (restricted to author or admin).
  * `DELETE /api/v1/posts/:id`: Soft-delete article (restricted to author or admin).
  * `POST /api/v1/posts/:id/restore`: Restore soft-deleted article (administrator only).
* **Zod Validation**: All requests are validated against strict Zod schemas before reaching the controller.
* **Slug Generation**: Uses `slugify` with collision resolution (e.g. `clean-code-architecture-1`) for SEO-friendly URLs.
* **Soft Deletes**: Posts are flagged with `isDeleted: true` and `deletedAt: new Date()`. Queries default to `{ isDeleted: { $ne: true } }`, hiding them from public feeds while preserving data integrity for admin restoration.

### 4. Nested Comments System
* Users can post comments on blog articles.
* Full CRUD support with Mongoose relational references (`ref: 'Post'`, `ref: 'User'`).
* **Permissions**: Users can edit and delete only their own comments. Administrators can moderate and remove any inappropriate comment.
* Deleting a blog post automatically handles associated comment clean-up.

### 5. Dedicated React Admin Panel
* Accessible at `/admin` (guarded by `AdminRoute` on the frontend and `requireRole('ADMIN')` on the backend).
* **Dashboard Overview**: Displays real-time counts for Total Users, Total Posts, and Total Comments.
* **User Directory & RBAC**: Search all users, promote/demote between `USER` and `ADMIN`, and toggle account status (`ACTIVE` vs `DEACTIVATED`).
  * Safety guards prevent deactivating your own account or demoting the last active administrator.
* **Post Moderation**: Inspect all active and soft-deleted articles with a one-click **Restore** action.
* **Comment Moderation**: Global table to inspect and remove comments across all articles.
* **System Audit Logs**: Real-time chronological audit trail of sensitive actions (logins, article deletions, role changes).

### 6. Real-Time Updates via Socket.io (Bonus Feature)
* Integrated WebSocket server (`socket.io`) running on the HTTP instance.
* When an author publishes a new blog post, a `new_post` event is broadcast to all active clients, updating the feed without page reloads.
* When comments are submitted, real-time updates are emitted to users viewing that specific article room (`post_<id>`).

---

## 📡 API Documentation Overview

**Base URL**: `http://localhost:5000/api/v1`

### Standard Response Envelope
All API endpoints return a uniform JSON structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "statusCode": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to modify this resource"
  }
}
```

### Core API Endpoints Reference

#### 1. Authentication Endpoints (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | Public | Register new user account (Zod validated) |
| `POST` | `/auth/login` | Public | Authenticate user, issue access token & refresh cookie |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for a new token pair |
| `POST` | `/auth/logout` | Public | Invalidate refresh token and clear cookies |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `PATCH`| `/auth/profile` | Authenticated | Update user bio and avatar |
| `GET` | `/auth/google` | Public | Initiate Google OAuth 2.0 flow |
| `GET` | `/auth/google/callback` | Public | Handle Google OAuth redirect |
| `GET` | `/auth/facebook` | Public | Initiate Facebook OAuth 2.0 flow |
| `GET` | `/auth/facebook/callback` | Public | Handle Facebook OAuth redirect |
| `POST` | `/auth/oauth/dev` | Public | Developer sandbox authentication |

#### 2. Post Endpoints (`/api/v1/posts`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/posts` | Public | Paginated list of articles (`?page=1&limit=10&search=&tag=`) |
| `GET` | `/posts/:id` | Public | Fetch article by MongoDB ID or URL slug |
| `POST` | `/posts` | Authenticated | Create a new blog post |
| `PATCH`| `/posts/:id` | Author / Admin | Update blog post (IDOR guarded) |
| `DELETE`|`/posts/:id` | Author / Admin | Soft-delete blog post (IDOR guarded) |
| `POST` | `/posts/:id/restore` | Admin Only | Restore a soft-deleted post |

#### 3. Comment Endpoints (`/api/v1/comments` & `/api/v1/posts/:postId/comments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/posts/:postId/comments` | Public | Get paginated comments for an article |
| `POST` | `/posts/:postId/comments` | Authenticated | Post a comment on an article |
| `PATCH`| `/comments/:id` | Author Only | Edit comment (IDOR guarded) |
| `DELETE`|`/comments/:id` | Author / Admin | Delete comment (IDOR guarded) |

#### 4. Admin Endpoints (`/api/v1/admin` - Requires `requireRole('ADMIN')`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/admin/stats` | Admin Only | Get platform metrics (counts of users, posts, comments) |
| `GET` | `/admin/users` | Admin Only | Paginated user directory with search filter |
| `PATCH`| `/admin/users/:id/role` | Admin Only | Promote or demote user role (`ADMIN` / `USER`) |
| `PATCH`| `/admin/users/:id/status` | Admin Only | Toggle user status (`ACTIVE` / `DEACTIVATED`) |
| `DELETE`|`/admin/users/:id` | Admin Only | Permanently delete user and revoke tokens |
| `GET` | `/admin/posts` | Admin Only | Global post moderation table including soft-deleted posts |
| `GET` | `/admin/comments` | Admin Only | Global comment moderation table |
| `GET` | `/admin/activity` | Admin Only | System audit log feed |

---

## 🧪 Automated Testing Suite (Jest & Vitest)

The application includes automated unit, integration, and security test suites:

### 1. Run Backend Tests (Jest + Supertest)
```bash
npm run test:server
```
Executes comprehensive test suites:
* **Unit Tests**:
  * Password hashing cost factor and salt verification (`tests/unit/password.test.js`).
  * JWT signing, algorithm pinning, and tamper rejection (`tests/unit/jwt.test.js`).
  * Zod request payload schema validation (`tests/unit/validators.test.js`).
* **Integration Tests**:
  * Authentication flows, token issuance, and replay detection (`tests/integration/auth.test.js`).
  * Post CRUD operations, slug generation, and soft-delete mechanics (`tests/integration/posts.test.js`).
  * Comment CRUD and parent-post relational integrity (`tests/integration/comments.test.js`).
  * Admin governance and RBAC privilege barriers (`tests/integration/admin.test.js`).
* **Security & VAPT Tests**:
  * NoSQL injection sanitization (`$gt` / `$` operator removal) (`tests/security/security.test.js`).
  * HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`).
  * Malformed JSON payload rejection without stack trace leakage.

### 2. Run Frontend Tests (Vitest + Testing Library)
```bash
npm run test:client
```
Executes React component tests verifying form rendering, error validation states, and authentication context integration.

### 3. Run All Tests
```bash
npm test
```

---

## 🔒 Security Hardening & VAPT Audit

A formal Vulnerability Assessment and Penetration Testing (VAPT) audit was performed against this platform.

* **Full VAPT Report**: [docs/security/VAPT-REPORT.md](docs/security/VAPT-REPORT.md)
* **Excel Test Matrix**: [qa/security-test-cases.xlsx](qa/security-test-cases.xlsx) (37+ OWASP scenarios mapped to source code files)

### Summary of Key Security Controls:
1. **Broken Object Level Authorization (BOLA / IDOR)**: Remediated via `requireOwnership` middleware. Users cannot modify or delete foreign posts or comments by manipulating IDs in URLs.
2. **Broken Authentication**: Remediated through bcrypt password hashing (12 rounds), rotating refresh token families, replay attack detection, and account lockout for deactivated users.
3. **Injection**: Remediated via recursive input sanitization removing `$` and `.` operators to eliminate NoSQL injection risks.
4. **Security Misconfiguration**: Enforced via Helmet security headers, CORS origin whitelisting, and centralized error handling suppressing internal stack traces.
5. **Lack of Rate Limiting**: Mitigated via separate general and strict authentication rate limiters preventing brute-force and DoS attacks.

---

## 🌐 Render.com Production Deployment

The project is pre-configured for deployment on **Render.com**:

### Dual-Service Architecture on Render:
1. **Backend Web Service (`blog-assignment`)**:
   * **Root Directory**: `server`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Environment Variables**:
     ```env
     NODE_ENV=production
     PORT=10000
     MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/blog_platform
     CLIENT_URL=https://<your-frontend-subdomain>.onrender.com
     JWT_ACCESS_SECRET=<64-char-hex-secret-1>
     JWT_REFRESH_SECRET=<64-char-hex-secret-2>
     COOKIE_SECRET=<64-char-hex-secret-3>
     ADMIN_EMAIL=admin@blogplatform.dev
     ADMIN_PASSWORD=AdminSecurePass123!
     GOOGLE_CALLBACK_URL=https://<your-backend-subdomain>.onrender.com/api/v1/auth/google/callback
     FACEBOOK_CALLBACK_URL=https://<your-backend-subdomain>.onrender.com/api/v1/auth/facebook/callback
     ```

2. **Frontend Static Site (`devlog-client`)**:
   * **Root Directory**: `client`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist`
   * **SPA Routing**: Handled automatically via [client/public/_redirects](client/public/_redirects) (`/* /index.html 200`).
   * **Environment Variables**:
     ```env
     VITE_API_URL=https://<your-backend-subdomain>.onrender.com/api/v1
     VITE_SOCKET_URL=https://<your-backend-subdomain>.onrender.com
     ```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
