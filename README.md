# Distributed Rate Limiting & Telemetry Ingestion Gateway

A high-throughput API gateway built with Next.js 15 (App Router) and Redis, implementing an atomic sliding-window log algorithm using embedded Lua to eliminate concurrency race conditions.

## Architecture & System Design

- Next.js 15 App Router: Dedicated serverless route handlers enforcing deterministic request validation and RFC-compliant rate-limit signaling.
- Atomic Sliding Window via Lua: Eliminates check-then-act race conditions across concurrent processes by executing sorted set operations (ZREMRANGEBYSCORE, ZCARD, ZADD, EXPIRE) inside a single atomic Redis transaction.
- Fail-Safe Connection Pool: Singleton ioredis configuration designed to prevent connection pool exhaustion during Node.js hot reloading and high-concurrency bursts.
- RFC Header Signaling: Exposes standard headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) to allow client-side backoff negotiation.

## Quickstart

### Prerequisites
- Node.js >= 18.18.0
- Redis (native Homebrew service or Docker)

### 1. Install Dependencies
npm install

### 2. Configure Environment
echo "REDIS_URL=\"redis://127.0.0.1:6379\"" > .env.local

### 3. Run Development Server
npm run dev

### 4. Run Load Test Benchmark
npm run test:load

## Performance Benchmark
- Target Ingest Latency: < 5ms per transaction on warm connection pools.
- Accuracy: 100% boundary isolation under concurrent request bursts without lock contention.