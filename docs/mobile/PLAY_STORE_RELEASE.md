# WASSLHA Android Release Gate

## Scope

WASSLHA Customer and WASSLHA Rider are released as separate Android applications.

- Customer package: `ma.wasslha.customer`
- Rider package: `ma.wasslha.rider`
- Build system: Expo SDK 54 + EAS Build
- Production artifact: Android App Bundle (`.aab`)
- Environments: development / preview / production

## Required EAS environment variables

Set these in the matching EAS environment; never commit values to Git:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

Client-side `EXPO_PUBLIC_*` values are not secrets. Supabase service-role keys, payment credentials, webhook signing keys and other private credentials must remain server-side.

## Customer build

From `apps/customer`:

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value <DEV_OR_PROD_URL> --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <ANON_KEY> --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_API_BASE_URL --value <PRODUCTION_API_URL> --environment production --visibility plaintext
eas build --platform android --profile production
eas submit --platform android --profile production
```

## Rider build

From `apps/rider`:

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value <DEV_OR_PROD_URL> --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <ANON_KEY> --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_API_BASE_URL --value <PRODUCTION_API_URL> --environment production --visibility plaintext
eas build --platform android --profile production
eas submit --platform android --profile production
```

## Production gate

A build must not be submitted to Google Play until all of these are PASS:

1. WASSLHA CI: API, Admin, Merchant, Rider and Customer checks pass.
2. Database migrations are applied to staging and production through the migration process.
3. RLS/security verification passes.
4. Customer → Merchant → Rider → Pickup → Delivery flow passes end-to-end.
5. COD flow passes.
6. Online payment provider integration and webhook reconciliation pass.
7. Financial ledger, rider earnings and merchant settlement reconciliation passes.
8. GPS/dispatch/live tracking passes in Berrechid.
9. Cancellation/refund/partial-refund failure cases pass.
10. Duplicate-order/idempotency tests pass.
11. Production API and Supabase environment variables are verified.
12. App privacy policy, data-safety declarations and store listing are reviewed before submission.
13. Android release artifact is an AAB and installs successfully in internal testing.
14. Crash/error monitoring and rollback procedure are verified.

## Important

The existence of an EAS profile does not mean the application has been published. Publication requires the project's Expo/EAS account, Android signing credentials, Google Play Console access, production environment values, payment-provider credentials and successful acceptance testing.
