# Campaign Ops Dashboard

A multi-role operations board for running short-form video campaigns between an owner, an operator, and a video editor — structured forms and one-way notices instead of free-form chat.

## Features

- **Role-based access** — Google sign-in (Firebase Authentication) with three roles: **Owner**, **Operator**, and **Editor**. New accounts onboard through owner-issued, one-time 6-digit activation codes (24-hour expiry) that grant a chosen role.
- **Campaign management** — Campaigns carry a code, a single unified brief link, a status pipeline (brief sent → editing → delivered → publishing → completed), and nested per-video tracking: platform, publish link, view counts, and platform-submission status.
- **Structured requests** — The operator sends fixed-field requests to the editor (verification code, account-data fields, or file delivery). No free-text back-and-forth; the editor fills exactly the requested fields.
- **One-way notices** — Directive notices with priorities (normal / important / urgent) and read receipts; the editor acknowledges with a single tap.
- **Incident log & quality stats** — Log account bans/restrictions, platform rejections, editing errors, and delivery delays, with aggregate quality and rejection-rate statistics for oversight.
- **Owner oversight** — A full read model across campaigns, requests, notices, and incidents, plus a board switcher to audit exactly what each role sees, and role administration.
- **Realtime sync** — Firestore live listeners keep every board current, with a local cache of last-known server data.
- **Arabic-first RTL interface**, also packaged for Android via Capacitor.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Firebase Authentication (Google) + Cloud Firestore
- Capacitor 8 (Android packaging)
- Motion, Lucide icons

## Getting Started

**Prerequisites:** Node.js 18+ and a Firebase project with Authentication (Google provider) and Firestore enabled.

1. Clone the repository:
   ```bash
   git clone <your-fork-url> campaign-ops-dashboard
   cd campaign-ops-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your Firebase web config from the example and fill in your project values:
   ```bash
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
4. Create your environment file:
   ```bash
   cp .env.example .env
   ```
5. Deploy the included `firestore.rules` to your Firebase project, then sign in once with the account you set as `OWNER_EMAIL` in `src/data/roles.ts` to bootstrap the owner role.
6. Run the dev server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  components/   Operator*, Editor*, OwnerView, RoleAdmin, AuthGate, Header
  data/         firebase.ts (app init), auth.ts (sign-in), roles.ts (roles + activation),
                repo.ts (Firestore data layer), types.ts (domain model)
  utils/        formatters
firestore.rules         Firestore security rules
firebase-blueprint.json Firestore entity/collection blueprint
capacitor.config.json   Android packaging config
```

## License

MIT — see [LICENSE](LICENSE).
