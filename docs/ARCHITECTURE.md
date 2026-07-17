# Shatter DAMS — System Architecture Documentation

> **Last Updated**: July 2026
> **Status**: Development Phase

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. High-Level Architecture](#2-high-level-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. Frontend Architecture](#4-frontend-architecture)
- [5. Backend Architecture](#5-backend-architecture)
- [6. Database Schema & Data Model](#6-database-schema--data-model)
- [7. Multi-Tenant Strategy](#7-multi-tenant-strategy)

---

## 1. System Overview

**Shatter DAMS** (Digital Asset Management System) has evolved into a comprehensive business management suite for organizations. It handles digital assets alongside robust features like client management, project tracking, invoicing, quotations, timesheets, and payroll. 

The system operates across distinct portals (e.g., Admin, Team, Client) managed via a unified React SPA and a multi-tenant backend API.

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Tier"
        Browser["User Browser<br>(Subdomain Detection)"]
    end

    subgraph "Frontend Tier"
        SPA["Vite + React SPA<br>(Deployed on Edge/CDN)"]
    end

    subgraph "API Tier"
        API["Cloudflare Worker<br>(Hono Framework)"]
    end

    subgraph "Data Tier"
        DB["PostgreSQL Database<br>(via Drizzle ORM)"]
        Storage["Cloudflare R2 / S3<br>(Object Storage)"]
    end

    Browser -->|Serves Static Assets| SPA
    Browser -->|REST API Calls (CORS)| API
    API -->|SQL Queries| DB
    API -->|File Uploads/Downloads| Storage
```

**Architecture Pattern**: Decoupled Serverless SPA + API
- **Frontend**: A single Vite + React application handles all portals using client-side routing.
- **Backend**: A serverless API built on Cloudflare Workers using the Hono framework.
- **Database**: PostgreSQL with Drizzle ORM.

---

## 3. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React (v19) |
| Build Tool | Vite |
| Routing | react-router-dom |
| Styling | Tailwind CSS (v4) |
| Language | TypeScript |
| UI Components | Custom + `lucide-react` for icons |
| PDF Generation | `jspdf` |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | PostgreSQL |
| ORM | Drizzle ORM (`drizzle-orm/pg-core`) |
| Storage | Cloudflare R2 / S3 Client (`@aws-sdk/client-s3`) |
| Language | TypeScript |
| Email | Resend |
| Dev Tooling | Wrangler |

---

## 4. Frontend Architecture

The frontend is a unified SPA. It relies on context-based routing or subdomain detection to switch views between different user roles.

### Core Structure
- `src/main.tsx`: React entry point.
- `src/App.tsx`: Main application router.
- `src/components/`: Reusable UI primitives and shared components.
- `src/pages/`: Specific views separated by feature (e.g., Auth, Dashboard, Invoices).
- `src/services/api.ts`: Centralized fetch wrapper for communicating with the Hono backend.

### Vite Config & Proxy
During development, the frontend at `localhost:5173` proxies `/api` requests to the Wrangler dev server at `localhost:8787` to bypass CORS issues.

---

## 5. Backend Architecture

The backend is built as a single Cloudflare Worker using Hono.

### Core Structure
- `src/index.ts`: The entry point that mounts CORS middleware, error handlers, and route modules.
- `src/routes/`: Route handlers split by feature domain (e.g., `auth`, `clients`, `projects`, `invoices`, `users`).
- `src/db/`: Contains `schema.ts` (Drizzle ORM definitions) and `relations.ts`.
- `wrangler.jsonc`: Cloudflare Worker configuration, defining the worker name (`shatterdamsjs`), bindings, and compatibility dates.

### Routing Logic
Hono mounts domain-specific routes under `/api/*`:
- `/api/auth`
- `/api/clients`
- `/api/projects`
- `/api/tasks`
- `/api/invoices`
- `/api/quotes`
- `/api/timesheets`
...and more.

---

## 6. Database Schema & Data Model

The database uses a robust PostgreSQL schema defined via Drizzle ORM. Key tables include:

1. **`tenants`**: The root of the multi-tenant architecture. Every other entity belongs to a tenant.
2. **`users`**: Contains user credentials and profile details.
3. **`user_roles`**: Maps users to roles (`administrator`, `freelancer`, `client`, `employee`).
4. **`clients`**: External companies/clients interacting with the organization.
5. **`projects` & `tasks`**: Core project management.
6. **`milestones`**: Key deliverables within a project.
7. **`invoices` & `invoice_items`**: Billing and invoicing.
8. **`quotations` & `quotation_items`**: Quotes sent to clients.
9. **`timesheets`**: Time tracking for users working on projects/tasks.
10. **`files` & `file_comments`**: Digital asset management and collaboration.
11. **`payroll_logs`**: Payment records for employees/freelancers.
12. **`activity_logs`**: Audit trails for system actions.

---

## 7. Multi-Tenant Strategy

The system is designed ground-up for multi-tenancy. 
- A `tenants` table defines distinct organizations or workspaces.
- Almost every table (e.g., `users`, `projects`, `invoices`, `files`) has a `tenant_id` foreign key.
- The API enforces data isolation ensuring users can only read/write data associated with their `tenant_id`.
