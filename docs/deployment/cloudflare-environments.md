# WASSLHA Cloudflare Environment Deployment

## Purpose

This document defines the safe Cloudflare deployment boundary for the WASSLHA Berrechid MVP.

The deployment model is:

Development -> Staging -> Production

Each environment must use its own Supabase project, Cloudflare Worker environment, secrets, and configuration.

## Environment mapping

| Environment | Cloudflare Worker | Supabase |
|---|---|---|
| Development | `wasslha-api` | `wasslha-dev` |
| Staging | `wasslha-api-staging` | `wasslha-staging` |
| Production | `wasslha-api-production` | `wasslha-production` |

The existing `wasslha-v1` Supabase project is not part of the WASSLHA MVP deployment path and must not receive the current WASSLHA migrations or production credentials.

## Secrets

Never commit these values to Git:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `PAYMENT_SECRET_KEY`

Configure them as Cloudflare Worker secrets for the specific environment.

## Non-secret variables

`ENVIRONMENT` is defined in `wrangler.toml`.

`ALLOWED_ORIGINS` must be configured for every deployed browser-facing environment. Production readiness intentionally fails when this allow-list is missing.

## Deployment commands

Development:

```bash
pnpm --filter @wasslha/api build
pnpm --filter @wasslha/api test
cd apps/api
npx wrangler deploy
```

Staging:

```bash
cd apps/api
npx wrangler deploy --env staging
```

Production:

```bash
cd apps/api
npx wrangler deploy --env production
```

Production deployment is gated by the WASSLHA acceptance requirements and must not be treated as the next automatic step.

## Readiness

The API exposes:

- `GET /api/v1/health` — process health only.
- `GET /api/v1/ready` — deployment readiness.

Readiness requires:

- Supabase URL
- Supabase anon key
- Supabase service-role key
- production CORS allow-list

The endpoint reports only whether each configuration item is present; it never returns secret values.

## Security rules

1. Development credentials never access production.
2. Production credentials never enter GitHub source files.
3. Supabase service-role credentials stay server-side.
4. `wasslha-v1` remains isolated from the current WASSLHA development schema.
5. Database changes remain version-controlled migrations.
6. Production is not deployed before security, RLS, financial, recovery, and end-to-end acceptance.

## Dashboard integration

The Admin and Merchant dashboards consume the backend API. They must use the API URL belonging to the same environment as their deployment.

Do not point a Development dashboard at Production API/database resources.

## Rollback

Cloudflare deployment rollback must use a previously validated Worker version. Database rollback must use a version-controlled migration/recovery procedure; destructive manual edits are not an accepted financial correction mechanism.
