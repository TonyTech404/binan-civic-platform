# CI/CD

Two workflows, so deploying is your choice — **push-button CI/CD** or **local CLI**.

## Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** (`ci.yml`) | every PR + push to `main` | Installs, typechecks, and builds `apps/alerto`. Gate before merge. |
| **Deploy** (`deploy.yml`) | manual (**Actions → Deploy → Run workflow**) | Builds for Cloudflare and `wrangler deploy`s the chosen app. |

## The two deploy options

**A. CI/CD (GitHub Actions)** — Actions tab → **Deploy** → *Run workflow* → pick the app.

**B. Local (Cloudflare CLI)** — from the app dir:
```bash
cd apps/alerto
pnpm run deploy        # = next build && opennextjs-cloudflare build && wrangler deploy
```
Both run the identical build + `wrangler deploy`, so they produce the same result.

## One-time setup for option A

Already configured (repo **Variables**): `CLOUDFLARE_ACCOUNT_ID`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (all public).

You must add **one secret** — a Cloudflare API token:

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token** → use the
   **"Edit Cloudflare Workers"** template → scope it to this account.
2. Add it to GitHub:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   # paste the token when prompted
   ```

The Worker's *runtime* secrets (Supabase service role, Telegram bot token,
webhook secret) already live on the Worker and are **not** touched by a deploy.

## Adding another app

Add its name to the `app` choice list in `deploy.yml` (and a build/typecheck
step in `ci.yml` if it should be gated). Each app deploys with its own
`wrangler.toml`.
