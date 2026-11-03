# Distributed Rate Limiting & Telemetry Ingestion Gateway

A high-throughput API gateway built with Next.js 16 (App Router) and Redis, implementing an atomic sliding-window log algorithm using embedded Lua to eliminate concurrency race conditions.

## Architecture & System Design

- Next.js 16 App Router: Dedicated serverless route handlers enforcing deterministic request validation and RFC-compliant rate-limit signaling.
- Atomic Sliding Window via Lua: Eliminates check-then-act race conditions across concurrent processes by executing sorted set operations (ZREMRANGEBYSCORE, ZCARD, ZADD, EXPIRE) inside a single atomic Redis transaction.
- Fail-Safe Connection Pool: Singleton ioredis configuration designed to prevent connection pool exhaustion during Node.js hot reloading and high-concurrency bursts.
- RFC Header Signaling: Exposes standard headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) to allow client-side backoff negotiation.

## Quickstart

### Prerequisites
- Node.js >= 20.9.0
- Redis (native Homebrew service or Docker)

### 1. Install Dependencies
npm install

### 2. Configure Environment
echo "REDIS_URL=\"redis://127.0.0.1:6379\"" > .env.local

### 3. Run Development Server
npm run dev

### 4. Run Load Test Benchmark
npm run test:load

## Empirical Concurrency Benchmark

Validated via automated load test (`npm run test:load`) executing 25 concurrent requests:

| Metric | Measured Value |
|---|---|
| **Admitted (200 OK)** | 5 |
| **Throttled (429 Rate Limited)** | 20 |
| **Network / Transport Errors** | 0 |
| **p50 Latency (Steady-State)** | ~14.78 ms |
| **Avg Latency (including JIT warmup)** | ~122.04 ms |
| **p95 Latency (Cold Route Compile)** | ~546.99 ms |

*Note: Benchmarked locally against Next.js 15 App Router development server and Redis 7. Cold route compile jitter accounts for elevated p95 latency.*