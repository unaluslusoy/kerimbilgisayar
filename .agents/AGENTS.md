# Kerim Bilgisayar — Project-Scoped Rules for AI Agents

These rules are specific to this codebase and must be followed by any AI agent working on this repository to prevent regression and production crashes.

## 1. Database Connection and Host Configuration
* **Rule:** Do NOT configure the production database host `DATABASE_HOST` to use the external server IP address (`45.43.152.5`). 
* **Reasoning:** Port `3306` is blocked externally on the production server. The application must connect to MySQL locally using `127.0.0.1` or `localhost`.
* **Code Implementation:** A dynamic host translation is active in [db/index.ts](file:///c:/xampp/htdocs/kerimbilgisayar/src/db/index.ts). Do not revert this override.

## 2. Process Crash Prevention (Error Handling)
* **Rule:** Do NOT call `process.exit(1)` inside the `unhandledRejection` process event handler in [server.ts](file:///c:/xampp/htdocs/kerimbilgisayar/server.ts).
* **Reasoning:** In production, transient database network hiccups can cause temporary promise rejections. Crashing the process immediately results in persistent website downtime and loops. Keep the process alive on rejections, only log them.

## 3. Memory Leak Prevention
* **Rule:** Any global in-memory tracking Maps or caches (e.g., rate-limiting counters like `requestCounters` or `autoBlockedIps`) must be periodically pruned.
* **Reasoning:** High traffic will accumulate IP addresses in memory, causing a memory leak and resulting in eventual server restarts. Ensure the cleanup interval in [server.ts](file:///c:/xampp/htdocs/kerimbilgisayar/server.ts) is maintained.

## 4. CI/CD Deployment Environment Variables
* **Rule:** When modifying [.github/workflows/deploy.yml](file:///c:/xampp/htdocs/kerimbilgisayar/.github/workflows/deploy.yml), make sure `JWT_SECRET` and `ALLOWED_ORIGINS` are correctly generated/passed and written to the remote `.env` during SSH setup.
* **Reasoning:** The server relies on `JWT_SECRET` for secure session validation. If missing, it falls back to a derived secret, printing security warnings.
