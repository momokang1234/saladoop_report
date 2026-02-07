# CLAUDE.md - AI Assistant Guide for Saladoop Report System

## Project Overview

**Saladoop Report System** is a full-stack web application for restaurant daily shift reporting. Staff members log reports at different shift stages (Open, Middle, Close) with photo evidence and structured checklists. Reports are automatically distributed to management via email and Slack.

- **Domain:** Restaurant operations management (Saladoop restaurant)
- **Primary language:** Korean (UI strings, documentation, and user-facing content)
- **Live URL:** https://saladoopreport-2026.web.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6.2 |
| Styling | Tailwind CSS (CDN), Framer Motion (animations) |
| Icons | Lucide React |
| Auth | Firebase Authentication (Google OAuth) |
| Database | Cloud Firestore (asia-northeast3) |
| File Storage | Firebase Cloud Storage |
| Email | Cloud Functions + Nodemailer |
| Slack | Vercel Serverless Functions |
| Hosting | Firebase Hosting |
| PWA | vite-plugin-pwa |

## Project Structure

```
saladoop_report/
├── App.tsx              # Main React component (monolithic, ~627 lines)
├── index.tsx            # React entry point
├── index.html           # HTML template (loads Tailwind via CDN)
├── index.css            # Global styles (glassmorphism theme)
├── types.ts             # TypeScript type definitions (enums, interfaces)
├── firebase.ts          # Firebase SDK initialization & config
├── geminiService.ts     # Deprecated Gemini AI integration (unused)
├── vite.config.ts       # Vite config (port 3000, PWA, path aliases)
├── tsconfig.json        # TypeScript config (ES2022, strict, bundler resolution)
├── package.json         # Frontend dependencies & scripts
├── metadata.json        # PWA metadata
│
├── firebase.json        # Firebase project config (hosting, functions, storage)
├── .firebaserc          # Firebase project ID
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json
├── storage.rules        # Cloud Storage security rules
│
├── functions/           # Firebase Cloud Functions (email trigger)
│   ├── src/index.ts     # Firestore onCreate trigger -> sends email
│   ├── lib/             # Compiled JS output
│   ├── package.json     # Node 20, firebase-admin, nodemailer
│   ├── tsconfig.json
│   └── .env             # Email credentials (GMAIL_USER, GMAIL_APP_PASSWORD)
│
├── api/                 # Vercel serverless functions
│   └── send-slack.ts    # POST endpoint for Slack webhook notifications
│
├── legacy/              # Previous Google Sheets-based implementation
│   ├── README.md
│   ├── GUIDE.md
│   └── App_spreadsheet_v4.tsx.bak
│
└── dist/                # Build output (gitignored, served by Firebase Hosting)
```

## Quick Commands

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Deploy to GitHub Pages
npm run deploy

# Deploy to Firebase (hosting + functions + rules)
firebase deploy

# Cloud Functions only
cd functions && npm run build    # Compile TypeScript
firebase deploy --only functions

# Firebase emulators (functions)
cd functions && npm run serve
```

## Key Architecture Details

### Frontend (App.tsx)

The entire UI lives in a single `App.tsx` file. It manages four view modes via the `ViewMode` type:
- `auth` - Google login screen
- `form` - Shift report form (main view)
- `success` - Post-submission confirmation
- `history` - Admin-only report history with date filtering

**Shift stages** (`ShiftStage` enum): OPEN, MIDDLE, CLOSE - each has different photo guide checklists hardcoded as constants in App.tsx.

**Key types** (defined in `types.ts`):
- `ReporterName` enum: KBK, MSJ
- `ShiftStage` enum: OPEN, MIDDLE, CLOSE
- `BusyLevel` type: 4-level busy indicator
- `ReportSchema` interface: Full report document shape
- `FormData` type: Client-side form state
- `ViewMode` type: UI navigation state

### Data Flow

1. User authenticates via Google OAuth (Firebase Auth)
2. User fills shift report form with photos and checklist
3. Photos are compressed client-side (max 1200px width) before upload
4. Report is saved to Firestore collection
5. Cloud Function triggers on Firestore document creation -> sends email via Nodemailer
6. Client also POSTs to `/api/send-slack` (Vercel function) -> sends Slack notification

### Authentication & Authorization

- Google OAuth via Firebase Auth
- Admin check: hardcoded email comparison (`user.email === 'daviidkang@gmail.com'`)
- Firestore rules: any authenticated user can read/write all documents
- Storage rules: users can only access their own path (`/reports/{uid}/*`)

### Cloud Functions (functions/)

- **Runtime:** Node.js 20
- **TypeScript:** 4.9 (separate tsconfig from frontend)
- **Trigger:** Firestore `onCreate` on reports collection
- **Action:** Sends formatted HTML email via Gmail SMTP (Nodemailer)
- **Region:** asia-northeast3

### Vercel Serverless (api/)

- `send-slack.ts`: Accepts POST with report data, formats Slack Block Kit message, sends to webhook URL from `SLACK_WEBHOOK_URL` env var

## Path Alias

`@/*` maps to the project root. Example: `import { ReportSchema } from '@/types'`

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | `.env.local` (root) | Deprecated - Gemini AI key |
| `GMAIL_USER` | `functions/.env` | Gmail address for sending reports |
| `GMAIL_APP_PASSWORD` | `functions/.env` | Gmail app-specific password |
| `SLACK_WEBHOOK_URL` | Vercel env config | Slack incoming webhook URL |

## Important Conventions

1. **Korean content:** All user-facing strings, enum values, comments, and documentation are in Korean. Preserve this convention.
2. **Single-file frontend:** App.tsx is monolithic by design. New UI changes go in App.tsx unless extracting a component is explicitly requested.
3. **Glassmorphism UI:** The app uses a frosted-glass aesthetic with `backdrop-blur`, semi-transparent backgrounds, and smooth Framer Motion animations. Maintain this design language.
4. **Client-side photo compression:** Photos are resized to max 1200px width before uploading to reduce storage and bandwidth.
5. **No test suite:** There are no automated tests configured. No test runner, no test files.
6. **No CI/CD:** Deployments are manual via `firebase deploy` and `npm run deploy`.
7. **No linter/formatter:** No ESLint, Prettier, or other code quality tools are configured.
8. **Module system:** ES modules (`"type": "module"` in package.json).

## Firebase Project

- **Project:** saladoopreport-2026
- **Region:** asia-northeast3 (Seoul)
- **Services:** Auth, Firestore, Storage, Functions, Hosting

## Common Pitfalls

- `geminiService.ts` exists but is no longer used. The Gemini AI integration was removed.
- `@google/genai` is still in `dependencies` but unused.
- The `functions/` directory has its own separate `package.json`, `tsconfig.json`, and `node_modules`. Always `cd functions && npm install` separately.
- Tailwind CSS is loaded via CDN in `index.html`, not via PostCSS/build pipeline. Tailwind config changes require modifying the CDN script tag.
- Firebase config (API keys) is committed in `firebase.ts`. These are web API keys which are safe to expose per Firebase design, but sensitive credentials (Gmail password, Slack webhook) are in `.env` files.
