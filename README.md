# براندك — تطبيق الموبايل

The Brandak mobile app (Expo SDK 58, React Native 0.88, Expo Router, TypeScript), Arabic-only and RTL. One app for two kinds of user:

- **Customers:** browse brands and products, a separate cart per brand, cash on delivery, order tracking, wishlist and reviews.
- **Brand owners:** apply for a brand, subscribe and pay by InstaPay, then manage products, orders, customers, analytics and store settings from the "brand desk".

It talks directly to the API in `../brandak backend` (`/api/v1`) with a bearer token stored in SecureStore.

## Running it

```bash
npm install
cp .env.example .env          # EXPO_PUBLIC_API_BASE_URL
npx expo start                # Expo Go for quick checks
npx expo run:android          # development build (correct RTL + embedded fonts)
```

- Expo Go resets the RTL setting. The app forces RTL at runtime, but the first launch may need a reload.
- A development build (`expo run:*` or `eas build --profile development`) is the accurate way to test RTL.
- On a physical device, `localhost` points at the device itself. Use the deployed API or your PC's LAN IP.

## Commands

| | |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run gen:api` | regenerates `src/api/schema.d.ts` from `../brandak backend/openapi.json` |
| `npx eas-cli@latest build -p android --profile preview` | APK for testing |

## Structure

```
src/app/            screens (Expo Router)
  onboarding/       4 slides + interests picker (first launch only)
  (auth)/           login · register · verify (OTP) · forgot · reset
  (tabs)/           home · explore · cart · orders · account
  product/ brand/ category/ search checkout/ order/ review/ addresses/ ...
  seller/           apply · plans · pay/[id] · products/edit · orders/[id] · customers
  seller/(desk)/    brand desk: overview · orders · products · store
src/api/            client.ts (envelope + single-flight refresh) · queries.ts · types.ts · errors.ts (Arabic copy)
src/auth/           session (SecureStore + zustand) · useMe · guest gate
src/ui/             design system: Text, Button, TextField, Sheet, Toast, Skeleton, EmptyState, Illustration, ...
src/theme/          tokens (same as the dashboard: #F16B21 / #C2500F, Reem Kufi + IBM Plex Sans Arabic)
src/features/       feature components (catalog, checkout, orders, seller, onboarding)
```

## Key decisions

- **Token refresh is single-flight.** The API rotates the refresh token and treats a reused one as theft. If several requests got a 401 at once and each refreshed, the session would be revoked. See `src/api/client.ts`.
- **Error messages are Arabic.** The API returns English messages, so the app maps them by `error.code` in `src/api/errors.ts`.
- **Guests can browse.** Adding to cart, the wishlist, ordering and opening a store show a "sign in to continue" sheet instead of throwing the user onto the login screen.
- **Checkout is idempotent.** An `Idempotency-Key` stays fixed for each attempt. On `PRICE_CHANGED` the app shows the new total and asks again.
- **No backend changes.** Push notifications will need an endpoint that registers the Expo push token; it doesn't exist yet.
