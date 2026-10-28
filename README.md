# Mini SMS Gateway (Express + TypeScript + Prisma)

Express 5 · TypeScript · PostgreSQL · Prisma 7 · JWT.
Accept an SMS request → charge credits → try mock providers by priority → refund if every one fails.

> Core guarantee: a credit is never lost or double-spent, even with parallel requests or a failing provider.

## Run it

Needs Node 22+ and Docker for Postgres (or your own Postgres: edit `DATABASE_URL` in `.env`).

```bash
cp .env.example .env      # 1. config (before npm install)
docker compose up -d      # 2. PostgreSQL on :5432
npm install               # 3. also generates the Prisma client
npm run migrate           # 4. create the tables (prisma migrate deploy)
npm run dev               # 5. http://localhost:3000 (ROUTE_A/B/C are seeded on start)
```

`npm start` runs without file watching. Production: `npm run build && npm run start:prod`.

```bash
B=http://localhost:3000
TOKEN=$(curl -s -X POST $B/auth/register -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}' | jq -r .accessToken)

curl -s -X POST $B/sms/send -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"to":["9841234567","+9779801122334"],"message":"Hello"}' | jq
curl -s "$B/sms/logs"      -H "authorization: Bearer $TOKEN" | jq   # route + every failover attempt
curl -s  $B/routes/health  -H "authorization: Bearer $TOKEN" | jq
curl -s  $B/wallet         -H "authorization: Bearer $TOKEN" | jq
```

## Endpoints

| Method | Path             | What it does                                                                                |
| ------ | ---------------- | ------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | `{email, password}` → JWT. Starts with `INITIAL_CREDITS` (default 100).                     |
| POST   | `/auth/login`    | → JWT                                                                                       |
| GET    | `/wallet`        | Balance + last 20 ledger entries                                                            |
| POST   | `/sms/send`      | `{to: string[], message}`: validate, price, charge, send with failover, refund failures     |
| GET    | `/sms/logs`      | Paginated. Filters: `status` (pending/sent/failed), `from`, `to`, `number`, `page`, `limit` |
| GET    | `/routes/health` | Per route: balance, attempts and success rate (24 h), health %                              |

All except `/auth/*` need `Authorization: Bearer <jwt>`.

`/sms/send` is synchronous: when it returns, every message is already `sent` or `failed` (and refunded).
**200** processed (body has `sent`, `failed`, final `balance`, per-message status and route) ·
**400** invalid number(s), all listed with their index, nothing charged ·
**402** not enough credits (`required` / `available`), nothing charged.

## Rules

| Encoding                                | One SMS | Per part if longer |
| --------------------------------------- | ------- | ------------------ |
| GSM-7 (only standard characters)        | 160     | 153                |
| Unicode (Nepali, emoji, any other char) | 70      | 67                 |

One non-GSM character makes the whole message Unicode. GSM extension characters (`[ ] { } \ ^ ~ | €`) count as 2, an emoji counts as 2 Unicode units, and a character is never split across two parts.

**Price:** 1 credit per SMS part per recipient, so `cost = parts × recipients`.
**Numbers:** 10 digits starting `97`/`98`; a `+977` / `977` prefix is removed.

## How credits stay correct

1. **Atomic reservation.** One conditional update checks and deducts: `wallet.updateMany({ where: { userId, balance: { gte: cost } }, data: { balance: { decrement: cost } } })`. Postgres locks the row, so a parallel request waits and re-checks the real balance. `count === 0` means 402. (`wallet.repository.ts`)
2. **Short transaction.** Reservation + pending messages + one DEBIT ledger row per message commit together. Providers are called **after** it, never inside it.
3. **Failover.** Enabled routes are tried by priority and every try is saved as a `ProviderAttempt`. The first success sets `sent` and the charge stays. Only if all routes fail is the message `failed` and refunded. (`sender.service.ts`)
4. **Refund exactly once.** `failAndRefund` flips `pending → failed` with a conditional update (only one caller can win) and credits the wallet **in the same transaction**. A unique index on the ledger `(messageId, type)` is a backup. (`wallet.service.ts`)
5. **Provider balance rule.** A route's balance is reserved before sending and given back if that send fails. Only a successful send keeps it deducted.
6. **Crash recovery.** If the server dies after charging but before delivering, messages stay `pending`. On the next start, `pending` messages older than 2 minutes are failed and refunded.
7. **Database `CHECK` constraints** (in the migration) keep wallet and provider balances from ever going below 0.

## Route health formula

```
successRate   = successful attempts / all attempts in the last 24 h   (no attempts = 100%)
balanceFactor = min(1, balance / 500)
health %      = round(successRate × balanceFactor)
health %      = 0 if the route is disabled or its balance is 0
```

A route is only as healthy as its success rate, scaled down once its balance drops under 500 parts because it is about to run dry. Routes skipped for low balance aren't counted (they weren't tried). The raw `successRate24h` is returned too. Downside: with very few attempts the number is noisy.

## Mock providers

Seeded on start: **ROUTE_A** (priority 1, fails 30%), **ROUTE_B** (2, 10%), **ROUTE_C** (3, 5%), 10,000 balance each. Each has `priority`, `balance`, a failure rate and `getBalance()`. Rates are read from the database on every send, so you can force outcomes for demos:

## Demo script (3–5 min)

| Scenario      | Setup                                                           | Expected                                            |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| Success       | all rates 0                                                     | `sent` via ROUTE_A, credits deducted                |
| Failover      | ROUTE_A rate 1                                                  | `sent` via ROUTE_B; `/sms/logs` shows both attempts |
| Refund        | all rates 1                                                     | `failed`, balance restored, 3 attempts logged       |
| Concurrency   | `INITIAL_CREDITS=10`, register, fire 20 parallel 1-credit sends | exactly 10 accepted, 10 × 402, balance 0            |
| Logs / health | any                                                             | filters, pagination, `/routes/health`               |

## Decisions and limits

- Sending is synchronous and one message at a time, so a request is capped at **100 recipients** (message max 10 parts). For bulk volume, add a queue.
- One message row per recipient: a partial failure refunds only the failed ones.
- One invalid number rejects the whole request before any charge. Duplicates are sent and charged as written.
- Log dates are UTC. A bare `to=2026-10-31` includes that whole day.
- If the server dies right after a provider accepted a message but before it was saved, that message is refunded on restart even though it was sent. Real providers need idempotency keys for this.
- The init migration is hand-written (it adds the `CHECK` constraints Prisma can't express). Apply it with `npm run migrate`. If `prisma migrate dev` ever reports drift, `npx prisma migrate reset` gives a clean local database.
