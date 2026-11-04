# Replica integration — WASSLHA

This repository is the independent WASSLHA local commerce and delivery monorepo for Berrechid. Keep all work inside this repository and preserve its app boundaries.

## Project facts
- Monorepo; inspect package.json and workspace manifests before running commands.
- Core stack includes Supabase, Cloudflare Workers, Cloudflare Pages, React Native + Expo, Google Maps, and Telegram operational notifications.
- Read the WASSLHA Master Product & Technical Specification and relevant app-level documentation before planning changes.

## Non-negotiable boundaries
- Never reuse or connect to BERRECHID IMMO or FINDLY databases, credentials, storage, workers, bots, or environment variables.
- Do not assume one shared backend/database across apps; inspect existing architecture and data boundaries first.
- Never deploy, alter Cloudflare production settings, change secrets, send real notifications, or run production migrations.
- Never modify payment, maps billing, auth, or delivery workflows without explicit user approval.
- Preserve the monorepo layout and package manager. Do not run root-wide installs or scripts until their effects are understood.
- Use synthetic fixtures only in tests; do not create fake real merchants, customers, orders, or deliveries.
- Before changing code, inspect the root specification, package manifests, app boundaries, and current branch. Do not replace established decisions.
- Use a feature branch and report exact files changed and tests run. Do not merge to main without approval.

## Clean-room and legal
Reimplement observable functionality only. Do not copy third-party source code, proprietary assets, logos, wording, or private APIs. Use original Arabic/French copy and properly licensed assets.
