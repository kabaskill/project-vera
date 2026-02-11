# Development Setup Guide

## Quick Start (One Command)

```bash
# 1. Install dependencies for all projects
bun install

# 2. Start everything (Redis + Backend + Admin Dashboard)
bun run dev
```

This will:
- Start Redis via Docker
- Start the backend server on port 3000
- Start the admin dashboard on port 3001

## Manual Setup (Step by Step)

### 1. Infrastructure (Redis)

```bash
# Start Redis
bun run infra:up

# Stop Redis
bun run infra:down
```

### 2. Database (Supabase)

```bash
# Start local Supabase
cd backend
supabase start

# Run migrations
bun run db:migrate

# Stop Supabase
supabase stop
```

### 3. Backend Server

```bash
cd backend
bun run dev
```

Server runs on: http://localhost:3000  
API Docs: http://localhost:3000/docs

### 4. Admin Dashboard

```bash
cd admin-dashboard
bun run dev
```

Dashboard runs on: http://localhost:3001

## Complete Setup Script

```bash
# Fresh install and start everything
bun run setup:local
```

This will:
1. Install dependencies for all projects
2. Start Redis container
3. Start Supabase local
4. Run database migrations
5. Start both backend and admin dashboard

## Development Workflow

### Daily Development

```bash
# Start all services
bun run dev

# Work on your code...

# Stop all services
Ctrl+C  # Stops backend and dashboard
bun run infra:down  # Stops Redis
bun run db:stop  # Stops Supabase (optional)
```

### Checking Service Status

```bash
# Redis
redis-cli ping  # Should return PONG

# Supabase
supabase status

# Backend
curl http://localhost:3000/api/v1/health
```

## Architecture

```
┌─────────────────┐
│   Admin Dashboard│  Port 3001 (Next.js)
│   (admin-dashboard/)
└────────┬────────┘
         │
         │ API Calls
         ▼
┌─────────────────┐
│  Backend Server │  Port 3000 (Fastify)
│    (backend/)   │
└────────┬────────┘
         │
         │ Reads/Writes
         ▼
┌─────────────────┐
│    PostgreSQL   │  Port 54322 (Supabase)
└─────────────────┘
         ▲
         │
┌─────────────────┐
│     Redis       │  Port 6379 (Job Queue)
└─────────────────┘
```

## Troubleshooting

### Port Already in Use

```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:6379 | xargs kill -9
```

### Redis Connection Failed

```bash
# Restart Redis
bun run infra:down
bun run infra:up
```

### Database Connection Issues

```bash
# Reset Supabase
cd backend
supabase stop
supabase start
bun run db:migrate
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_LOCAL_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
API_PREFIX=/api/v1
```

### Admin Dashboard (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```
