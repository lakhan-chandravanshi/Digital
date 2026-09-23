# Digital Heroes

Digital Heroes is a charity-first golf performance and monthly draw platform.

## Project structure

- `frontend/` - Next.js App Router, TypeScript, Tailwind CSS, and the public experience.
- `backend/` - TypeScript Express API, validation, and Prisma data layer.
- `backend/prisma/schema.prisma` - Neon PostgreSQL schema for users, subscriptions, scores, charities, draws, and winners.

## Local setup

1. Create `backend/.env` from `backend/.env.example` and add the connection string from your Neon project.
2. Install backend packages with `npm install --prefix backend`.
3. Generate the Prisma client with `npm run prisma:generate --prefix backend`.
4. Apply a development migration with `npm run prisma:migrate --prefix backend`.
5. Seed an admin account and starter charities with `npm run seed --prefix backend`.
6. Run the frontend with `npm run dev:frontend` and the API with `npm run dev:backend`.

The frontend runs on `http://localhost:3000`; the API runs on `http://localhost:4000`.

## Validation

```bash
npm run build:frontend
npm run build:backend
```

The score API contract validates Stableford values from 1 to 45 and requires a date. The database schema enforces one score per user per date and indexes the rolling-score query path. Stripe checkout and signed webhooks, draw simulation/publishing, tier distribution, rollover, proof submission, charity events, admin management, and payout status are implemented and require the environment variables above. Proof images are represented by stored URLs; connect object storage when you add provider credentials.