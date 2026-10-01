WASSLHA Architecture

Overview

WASSLHA uses a monorepo architecture for the Berrechid MVP.

Main Components

- GitHub — source control and repository
- Supabase — PostgreSQL, Auth, RLS and Storage
- Cloudflare Workers — Backend API and webhooks
- Cloudflare Pages — Admin and Merchant dashboards
- React Native + Expo — Customer and Rider mobile apps
- Google Maps Platform — GPS, routes, distance and ETA
- Telegram — operational notifications and alerts

Applications

- Customer Mobile App
- Rider Mobile App
- Merchant Dashboard
- Admin Dashboard
- Backend API

Environments

The system uses three isolated environments:

1. Development
2. Staging
3. Production

Production data and credentials must never be mixed with development or staging.

Architecture Principle

The backend is the authoritative layer for business rules, validation, security-sensitive operations and financial operations.

Database access must respect PostgreSQL RLS.

Financial and audit records must never be physically deleted.
