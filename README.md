# Shatter DAMS

Shatter DAMS (Digital Asset Management System) is a comprehensive business management suite for organizations. It handles digital assets alongside client management, project tracking, invoicing, quotations, timesheets, and payroll.

The system is built as a Decoupled Serverless SPA + API.

## Project Structure

- `frontend/`: The unified Vite + React SPA that serves the Admin, Team, and Client portals via subdomain detection.
- `backend/`: The Cloudflare Workers + Hono API that powers the application, connecting to a PostgreSQL database via Drizzle ORM.
- `docs/`: System documentation, architecture diagrams, and development standards.

## Documentation & Standards

Please review the standard operating procedures before contributing:
- [Architecture Documentation](file:///d:/Work/Shatter/WebProjects/Shatter%20DAMS/docs/ARCHITECTURE.md)
- [Coding Standards](file:///d:/Work/Shatter/WebProjects/Shatter%20DAMS/docs/CODING_STANDARDS.md)
- [Security Standards](file:///d:/Work/Shatter/WebProjects/Shatter%20DAMS/docs/SECURITY_STANDARDS.md)

## Development Setup

The project requires [Node.js](https://nodejs.org/) (v20+) and `npm`.

### 1. Database & Backend Setup

Navigate to the `backend/` directory:

```bash
cd backend
npm install
```

Configure your environment variables. Create a `.dev.vars` file in the `backend/` directory (ask your team lead for development secrets):

```env
DATABASE_URL="postgresql://user:password@host/dbname"
JWT_SECRET="your_secret_key"
```

Start the Cloudflare Wrangler development server:

```bash
npm run dev
```
The API will be available at `http://localhost:8787`.

### 2. Frontend Setup

In a new terminal window, navigate to the `frontend/` directory:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`. 
*Note: During local development, the frontend proxy automatically forwards `/api` requests to the Wrangler backend at `localhost:8787`.*

## Deployment

- **Frontend**: The `frontend/` artifact is built using `npm run build` and can be deployed to any static CDN (e.g., Cloudflare Pages, Vercel).
- **Backend**: The `backend/` is deployed to Cloudflare Workers using `npm run deploy` via Wrangler.
