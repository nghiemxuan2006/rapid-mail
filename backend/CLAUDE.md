# CLAUDE.md — Node.js/Express Rules (Free Sample)

Free sample from the CLAUDE.md Rules Pack → https://oliviacraftlat.gumroad.com/l/skdgt

These are 20 production-tested rules for Node.js / Express REST API projects. Drop this file into your repo root as `CLAUDE.md` so Claude Code (and any AI coding assistant that respects it) reads them on every task.

---

## Project Structure

Rule: Organize code as `routers/`, `controllers/`, `services/`, `repositories/`, `middleware/`, `models/`, `schema/`, `config/`, `utils/`, `worker/`. `routers/` only declare paths and wire middleware. `controllers/` handle req/res. `services/` contain business logic and are framework-agnostic (no `req`, no `res`). `repositories/` handle all DB queries — services call repositories, never Mongoose models directly. `models/` define Mongoose schemas and TypeScript types. `schema/` holds Zod validation schemas. `config/` handles env and DB connection. `utils/` for shared helpers and error classes. `worker/` for background RabbitMQ consumers. Never import Express types in `services/` or `repositories/`.

## Always Use async/await — Never Mix With Callbacks

Rule: All async code uses `async/await`. Never mix callback-style APIs with promise chains in the same function. If a library is callback-only, wrap it once in `util.promisify` and use the promise version everywhere. Never write `.then(...).catch(...)` — use `try/catch` instead.

## Centralized Error-Handling Middleware

Rule: All thrown errors are caught by `middleware/error-handler.ts` mounted last. Controllers never call `res.status().json()` directly for errors — they `throw` a subclass from `utils/error.ts` (e.g. `throw new NOT_FOUND_ERROR('...')`) and let the middleware format the response as `{ message }` with the appropriate status code. The base class is `HTTP_ERROR` with `statusCode` and `errorCode` fields; subclasses cover every HTTP error code and accept an optional custom message. Always use the most specific subclass available.

## Custom HTTP_ERROR Class

Rule: `HTTP_ERROR` in `utils/error.ts` is the base class with `statusCode: number` and `errorCode: string` (from `http-status`). Never throw plain `Error` from controllers, services, or repositories. Always throw a named subclass — every HTTP status code has a corresponding class (e.g. `NOT_FOUND_ERROR`, `UNAUTHORIZED_ERROR`, `BAD_REQUEST_ERROR`, `CONFLICT_ERROR`). Pass a custom message string when the default status phrase is not descriptive enough.

## Validate Every Input With Zod

Rule: Use Zod schemas to validate `req.body`, `req.query`, and `req.params` at the route boundary via a `validate(schema)` middleware. Never read raw `req.body.x` in a controller — always read from the parsed, typed object. Treat any unvalidated request data as hostile.

## Never Trust req.body

Rule: Reject unknown fields. Use Zod's `.strict()` on object schemas so extra properties fail validation. Never spread `req.body` into a database write (`{ ...req.body }`). Always pick explicit fields after validation.

## Consistent API Response Format

Rule: All JSON responses follow one shape. Success: `{ "message": "Human readable", "data": <payload> }`. For responses with no body (e.g. DELETE), return only `{ "message": "..." }`. Error: `{ "message": "Human readable" }` (handled by `middleware/error-handler.ts`). Never return bare arrays or strings. Never mix shapes between endpoints.

## Use Correct HTTP Status Codes

Rule: 200 for successful GET / PUT / PATCH. 201 for successful POST that creates a resource. 204 for successful DELETE with no body. 400 for validation errors. 401 for missing/invalid auth. 403 for authenticated-but-forbidden. 404 for missing resources. 409 for conflicts (duplicate key). 422 only if you distinguish it from 400. 500 only for unexpected server errors.

## TypeScript Strict Mode

Rule: `tsconfig.json` must have `"strict": true`, `"noUncheckedIndexedAccess": true`, and `"exactOptionalPropertyTypes": true`. Never use `any` — use `unknown` and narrow. Never use `as` casts to silence errors; fix the underlying type. Inferred types from Zod (`z.infer<typeof Schema>`) are the source of truth for request payloads.

## Environment Config — Validate at Boot

Rule: Load `.env` with `dotenv` once at the entry point, then parse `process.env` through a Zod schema into a typed `config` object. Crash on boot if required env vars are missing or malformed. Never read `process.env.X` outside of `config/env.ts`.

## Never Commit Secrets

Rule: `.env` is gitignored. Commit a `.env.example` with the variable names and dummy values. Reject PRs that introduce hardcoded API keys, tokens, or connection strings.

## Security Headers + CORS

Rule: `app.use(helmet())` is mounted before any route. CORS is configured with an explicit allowlist of origins from config — never `cors({ origin: '*' })` in production. Rate-limit auth endpoints with `express-rate-limit`.

## Never Log Sensitive Data

Rule: Logger never outputs request bodies for auth routes, password fields, tokens, or full credit card numbers. Use a redaction list in the logger config (pino's `redact` option). PII is hashed or omitted in logs.

## Structured Logging Only

Rule: Use `pino` (or `winston`) with JSON output. Never use `console.log` outside of one-off scripts. Every log line includes a `requestId` from `req.id` (set by `pino-http` or a UUID middleware) so logs are traceable across services.

## Database Access Through Repositories

Rule: All DB queries live in `repositories/`. Services call repositories, never Mongoose models directly. Use Mongoose methods — never string-concatenate queries. Never use raw queries with user input interpolated.

## Transactions for Multi-Step Writes

Rule: Any operation that writes to two or more rows / tables runs inside a transaction. Roll back on any error. Never assume "the second write probably succeeded."

## Tests: Jest + Supertest

Rule: Every route has a Supertest integration test covering: happy path, validation failure (400), auth failure (401/403), and not-found (404). Unit-test services in isolation with mocked repositories. Use a real test database (Docker) for repository tests — never mock the database.

## No Test Pollution

Rule: Each test file runs in isolation with its own DB schema or transaction-rollback wrapper. Tests never depend on execution order. `beforeEach` resets state; `afterAll` closes connections.

## Graceful Shutdown

Rule: Listen for `SIGTERM` and `SIGINT`. On signal: stop accepting new connections (`server.close()`), drain in-flight requests with a timeout (default 10s), close DB pools, then `process.exit(0)`. Never `process.exit()` from inside a request handler.

## No Synchronous Filesystem in Request Path

Rule: Never call `fs.readFileSync`, `fs.writeFileSync`, or any `*Sync` API inside a route handler — they block the event loop. Use `fs/promises`. Synchronous calls are only allowed at boot (config loading) or in CLI scripts.

## Health & Readiness Endpoints

Rule: Expose `GET /health` (process is alive) and `GET /ready` (DB / dependencies reachable). `/health` is cheap and never queries the DB. `/ready` checks downstream connections and returns 503 if any are down. Both return JSON, not plain text.

---

**Want the full pack?** 50+ production-tested CLAUDE.md rules covering React, TypeScript, Python, Go, Rust, Postgres, and more — one-time payment, lifetime updates.

→ https://oliviacraftlat.gumroad.com/l/skdgt
Beta
0 / 0
used queries
1