# RocketLevel AI Routing Console

RocketLevel AI Routing Console is a controlled self-service web application for customer-facing routing management. It allows tenant users to manage approved schedule settings and coverage membership/order without exposing internal routing architecture or backend identifiers.

Tagline: `Smarter Routing. Less Complexity.`

## Product Overview

This product is intentionally not a full internal administration portal. During onboarding, RocketLevel AI staff configure the routing architecture, baseline schedules, and backend mappings. Customers then use this application only for approved changes:

- weekly business hours
- holiday closures
- temporary overrides
- approved coverage members
- coverage order
- approved destination numbers when policy allows

Everything else remains hidden and immutable.

## Architecture Summary

The application uses a layered architecture:

- `app/`: Next.js App Router pages and API route handlers
- `src/lib/`: auth, env parsing, tenancy guards, validation, and utilities
- `src/repositories/`: Prisma-backed persistence layer
- `src/services/`: business logic and Routing Engine API sync orchestration
- `src/components/`: shared layout and feature UI
- `prisma/`: schema and seed data
- `tests/`: auth, validation, tenant boundary, and sync tests

The sync model is local-first:

1. Customer changes are validated in the app.
2. Canonical state is stored in PostgreSQL.
3. A sync job is created.
4. Approved fields are sent to the Routing Engine API through a vendor-neutral abstraction.
5. Sync results are persisted and surfaced in the UI.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Auth.js / NextAuth credentials auth
- Zod
- React Hook Form-ready validation schemas
- Docker
- GitHub Actions
- Optional Redis slot in `.env.example` for future rate limiting or caching upgrades

## Prisma Schema

Core models:

- `User`
- `Domain`
- `Membership`
- `Session`
- `VerificationToken`
- `ScheduleTemplate`
- `WeeklyScheduleRule`
- `HolidayClosure`
- `ScheduleOverride`
- `CoverageGroup`
- `CoverageMember`
- `AllowedNumberPool`
- `BackendMapping`
- `AuditLog`
- `SyncJob`

Design notes:

- every customer user belongs to exactly one domain through membership
- admins can access all domains
- backend mappings are stored server-side only
- customer-editable routing state is distinct from hidden integration references
- audit and sync records preserve operational history

## Auth Model

- Email/password sign-in via Auth.js credentials provider
- Secure password hashing with `bcryptjs`
- Database-backed sessions through Prisma adapter
- Forgot password and reset password route handlers
- In-memory auth endpoint rate limiter placeholder with an interface that can be swapped for Redis
- Secrets remain server-side only

Seeded accounts:

- Admin: `admin@rocketlevel.ai` / `RocketLevel123!`
- Customer: `owner@northshore-dental.com` / `RocketLevel123!`
- Customer: `owner@summit-family-law.com` / `RocketLevel123!`

## Multi-Tenancy Model

Tenant isolation is enforced in three layers:

1. Session resolution
   - each request resolves the signed-in user and membership
2. Access context
   - customer sessions are assigned exactly one `domainId`
   - admin sessions are global
3. Server-side domain assertions
   - all schedule and coverage mutations call `assertDomainAccess`
   - customer users cannot act on any domain other than their own
   - backend mappings and admin pages require explicit admin access

The client never has authority over tenancy. Client-submitted domain identifiers are validated on the server before any mutation is applied.

## Customer Features

- Overview dashboard
- Weekly schedule visibility
- Holiday closure visibility
- Temporary overrides visibility
- Coverage member visibility
- Coverage reorder UI
- Domain change log
- Account page

## Admin Features

- Admin dashboard
- Domain list
- Domain detail
- User listing
- Backend mapping listing
- Audit log viewer
- Sync monitor
- Settings placeholder for future feature flags and impersonation

## Environment Variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `ROUTING_API_BASE_URL`
- `ROUTING_API_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `REDIS_URL` optional

Default `APP_URL` should point to:

- `https://jcit.digital`

## Local Setup

1. Install dependencies
```bash
npm install
```

2. Start PostgreSQL
```bash
docker compose up -d postgres
```

3. Generate Prisma client
```bash
npm run prisma:generate
```

4. Run database migrations
```bash
npm run prisma:migrate
```

5. Seed sample data
```bash
npm run db:seed
```

6. Start the app
```bash
npm run dev
```

## Build Commands

```bash
npm run build
npm run start
```

## Test Commands

```bash
npm test
```

Current test coverage includes:

- auth password helpers
- auth rate limiting helper
- schedule validation
- coverage validation
- tenant access boundaries
- sync service success/failure behavior

## API and Server Behavior

Route handlers implemented:

- `GET/PUT /api/schedule`
- `GET/PUT /api/coverage`
- `GET /api/overrides`
- `GET /api/audit-logs`
- `GET/POST /api/admin/backend-mappings`
- `POST /api/sync/retry`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Routing Engine API Abstraction

The vendor integration layer is abstracted behind:

- `RoutingEngineClient`
- `SyncService`
- `ScheduleService`
- `CoverageService`

The UI and repository layer never depend on vendor names or vendor object naming. Backend mappings exist solely to connect local canonical records to the external routing engine.

Current sync behavior:

- schedule sync updates real timeframe resources for weekly hours and holiday closures
- override sync creates managed specific-date timeframes plus answer rules for temporary routing changes
- coverage sync updates a real queue plus queue-agent membership/order

Recommended backend mapping metadata examples:

Schedule mapping metadata:
```json
{
  "domain": "customer-domain",
  "user": "routing-user@customer-domain",
  "weeklyTimeframeName": "Business Hours",
  "weeklyTimeframeId": "optional-existing-timeframe-id",
  "weeklyTimeframeScope": "domain",
  "holidayTimeframeName": "Holiday Closures",
  "holidayTimeframeId": "optional-existing-timeframe-id",
  "holidayTimeframeScope": "domain",
  "overrideTimeframePrefix": "RL-AI-Override",
  "overrideTimeframeScope": "user"
}
```

Coverage mapping metadata:
```json
{
  "domain": "customer-domain",
  "callqueue": "6000",
  "dispatchType": "Linear Cascade",
  "agentDispatchTimeoutSeconds": 15,
  "memberMappings": [
    {
      "memberType": "USER",
      "destinationNumber": "+15555550111",
      "agentId": "1000@customer-domain"
    },
    {
      "memberType": "EXTERNAL_NUMBER",
      "destinationNumber": "+15555550112",
      "agentId": "+15555550112"
    }
  ]
}
```

Notes:

- weekly schedule sync assumes onboarding already linked routing logic to the mapped timeframe names or IDs
- override sync is metadata-driven and requires a mapped routing user
- customer `USER` coverage members should have explicit `memberMappings` so the app never guesses hidden backend IDs

## Deployment

### Docker

```bash
docker compose up --build
```

### DigitalOcean App Platform

1. Push the repo to GitHub.
2. Create a new app from the repository.
3. Set the runtime to Node.js.
4. Add environment variables from `.env.example`.
5. Provision a managed PostgreSQL database.
6. Run:
   - `npm install`
   - `npm run prisma:generate`
   - `npm run prisma:deploy`
   - `npm run build`
7. Set the start command to:
```bash
npm run start
```

### DigitalOcean Droplet

1. Install Node.js 20, Docker, and PostgreSQL or point at managed PostgreSQL.
2. Clone the repo from GitHub.
3. Create `.env`.
4. Run:
```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run build
npm run start
```
5. Put the app behind Nginx or Caddy.
6. Add TLS for `jcit.digital` or the final RocketLevel AI production domain.
7. Add a health probe to `/login` or a dedicated future `/api/health` endpoint.

### GitHub Auto-Deploy to Droplet

This repo now includes [deploy.yml](/Users/mymacyou/Documents/RocketlevelPBX/.github/workflows/deploy.yml) for push-to-main deployment.

Required GitHub repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

Expected deploy path example:

- `/opt/rocketaischedule`

The workflow will:

- pull the latest `main`
- install dependencies
- generate Prisma client
- run production migrations
- reseed canonical sample/admin data
- build with increased Node heap
- restart PM2 with updated env

## CI Workflow

GitHub Actions currently runs:

- `npm install`
- `npm run prisma:generate`
- `npm test`
- `npm run build`

On `main`, the deploy workflow can also push directly to the DigitalOcean droplet once the required secrets are configured.

## Assumptions

- onboarding creates the underlying routing architecture before customer access begins
- every customer tenant has one primary schedule template and one primary coverage group
- customer users belong to exactly one domain
- admin users may operate across all domains
- allowed destination number policy is enforced with `AllowedNumberPool`
- SMTP credentials are available and valid for the chosen mail relay

## Production Hardening TODOs

- replace in-memory auth rate limiting with Redis
- add CSRF verification strategy for non-Auth.js forms if product scope expands
- add richer server actions and optimistic UI for schedule and coverage editing
- add domain-scoped feature flags
- add admin impersonation with explicit logging and support banners
- add CSV export for audit logs
- add background job worker for retry queues
- add dedicated health endpoint
- add end-to-end tests

## File Highlights

- `prisma/schema.prisma`: tenant-safe domain model
- `src/lib/tenant/access.ts`: session resolution
- `src/lib/tenant/guards.ts`: domain boundary enforcement
- `src/services/schedule-service.ts`: schedule mutation flow
- `src/services/coverage-service.ts`: coverage mutation flow
- `src/services/sync-service.ts`: sync job persistence and API orchestration
- `app/(app)/overview/page.tsx`: customer overview page
- `app/admin/page.tsx`: admin entry point
