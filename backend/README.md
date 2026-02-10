# Vera - Backend

Fastify-based backend for Vera price comparison app.

## Setup

### 1. Install Supabase CLI

```bash
# Using bun (recommended)
bun add -g supabase

# Or using npm
npm install -g supabase
```

### 2. Start Local Supabase

```bash
# Start local Supabase (runs PostgreSQL, Redis, etc. locally)
supabase start

# View status
supabase status

# Stop local Supabase
supabase stop
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run Database Migrations

```bash
# Migrations automatically use local database in development
bun run db:migrate
```

### 5. Start the Development Server

```bash
bun run dev
```

## API Documentation

Once running, visit: http://localhost:3000/docs

## Database Setup

The app automatically switches between databases based on environment:

- **Development**: Uses local Supabase (`SUPABASE_LOCAL_DB_URL`)
- **Production**: Uses cloud Supabase (`DATABASE_URL`)

### Supabase Local URLs (auto-configured)

- Database: `postgresql://postgres:postgres@localhost:54322/postgres`
- API: http://localhost:54321
- Studio: http://localhost:54323

### Syncing Local with Production

To pull production schema to local:
```bash
supabase db pull
```

To push local changes to production:
```bash
supabase db push
```

## Architecture

- **Fastify API**: Thin HTTP layer (`src/api/`)
- **Database**: PostgreSQL via Bun.sql (`src/db/`)
- **Events**: In-memory event bus (`src/events/`)
- **Workers**: Background job processors (`src/workers/`)

## Key Endpoints

- `POST /api/v1/products/submit-url` - Submit a product URL
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products/evaluate-price` - Evaluate price quality
- `POST /api/v1/users/register` - Register/get user
- `GET /api/v1/users/:userId/history` - Get user's product history

## Environment Variables

- `DATABASE_URL` - Production PostgreSQL connection string
- `SUPABASE_LOCAL_DB_URL` - Local development database URL
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
