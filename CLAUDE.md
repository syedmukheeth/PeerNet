# PeerNet

Social platform. Express + MongoDB + Socket.io backend, React + Vite frontend.
Backend deploys to Render, frontend to Vercel.

## Layout

```
backend/          Express API, port from PORT (5000 locally)
  src/server.js   boot: validateEnv -> Mongo -> Redis -> listen -> background services
  src/app.js      express app, CORS, rate limit, routes, error handler
  src/config/     db, redis, kafka, socket, cors, env, logger, cloudinary, metrics
  src/modules/    one folder per domain: Model.js + .routes + .controller + .service
  src/routes/v1/  mounts every module under /api/v1
frontend/
  src/api/axios.js  base URL resolution + token refresh interceptor
  src/pages/        route components
  src/components/   shared UI
  src/index.css     all styling, Tailwind 4 via @tailwindcss/vite
```

Root `package.json` only orchestrates the two packages. Real dependencies live in
`backend/package.json` and `frontend/package.json`.

## Commands

```bash
npm run dev --prefix backend      # nodemon
npm run dev --prefix frontend     # vite on 5173, proxies /api and /socket.io to :5000
npm run lint                      # both packages
npm test                          # jest (backend) + vitest (frontend)
npm run build --prefix frontend
```

## Conventions

- Backend is CommonJS with `'use strict'`. Frontend is ESM.
- Services throw `ApiError(status, message)`. Controllers `catch (err) { next(err) }`.
  The handler in `app.js` maps Mongoose CastError/ValidationError/duplicate-key
  onto real status codes, so do not hand-map those in controllers.
- Responses are `{ success, data }` or `{ success, message }`.
- 4-space indent in backend, 4-space in frontend JSX.
- No em dashes anywhere in code, comments, or user-facing copy.

## Redis is optional

Redis is a cache, presence store and socket fan-out bus, never a source of truth.
Always read it through `getRedisOptional()` and branch on null. `getRedis()`
throws and is only for callers that genuinely cannot continue. A closed client
still rejects every command, so never assume "client exists" means "usable".

## Kafka is optional

`KAFKA_BROKER` unset means `config/kafka.js` swaps in an in-process mock. Workers
keep their normal shape either way.

## Environment

`backend/src/config/env.js` validates at boot and rejects placeholder values like
`[ACCESS_SECRET]`. Required: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
Optional but feature-gating: `REDIS_URL`, `ALLOWED_ORIGINS`, `CLOUDINARY_*`,
`GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`.

The repo root `.env` is loaded before `backend/.env`, and dotenv never overwrites
an existing key, so root wins on any conflict. Put real secrets in root `.env`.

`ALLOWED_ORIGINS` accepts commas or spaces. Every deployed frontend origin must be
listed explicitly. Do not reintroduce a `.vercel.app` wildcard: with credentials
enabled that lets any Vercel account call the API.

## react-router: do not run `npm audit fix --force`

The frontend stays on `react-router-dom@7.18.2`. `npm audit` reports
GHSA-qwww-vcr4-c8h2 against it and offers 7.11.0 as the fix. Taking that offer
makes things worse:

- 7.18.2 carries one advisory, GHSA-qwww-vcr4-c8h2, which only applies to RSC
  mode. It needs server actions and framework mode. This app is a Vite SPA
  built on `BrowserRouter` with no loaders, no actions and no server runtime,
  so the vulnerable code is never reached.
- 7.11.0 carries four advisories, including an open redirect leading to XSS and
  an unauthenticated denial of service through route matching. Those are plain
  client-side routing bugs and would be reachable here.

The real patch is `react-router@8.3.0`, which requires React >= 19.2.7. Taking
it means upgrading React 18 to 19 first. Until that happens, 7.18.2 is the
most-patched version reachable, and the two Dependabot alerts are dismissed as
not affected rather than fixed.
