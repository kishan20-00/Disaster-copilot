# Workspace Rules for SafeRoute AI Developer Agents

This file defines style guidelines, behavioral constraints, and instructions for AI agents modifying the **SafeRoute AI** codebase.

---

## 🏷️ Brand Identity Guidelines
* **Application Name**: Always refer to the application as **SafeRoute AI** (in uppercase tracking and title cases).
* **Japanese Subtitle**: Always use **安心避難** (Anshin Hinan - Safe Evacuation) instead of `安心守り`.
* **Domain & URLs**: Ensure mock GPS/Tracker URLs use `https://saferoute.ai/t/...` instead of the old `mamori.ai` links.

---

## 🔑 Authentication Standards
* **Real OAuth Handshake**: No simulated Google login routes are allowed. All sign-ins must flow through the official **Google Identity Services (GSI) SDK** client.
* **Button Render**: The Sign-In button must be rendered by the `google.accounts.id.renderButton` GSI container inside `src/App.tsx`.
* **Zero-Bloat Token Decoding**: Decode Google Credentials (JWTs) using the lightweight, dependency-free `parseJwt` utility. Do not install heavy npm wrappers.
* **Session Persistence**: The session is persisted to `localStorage` (`src/lib/session.ts`) and rehydrated on load so a refresh keeps the user signed in; it honors the Google token `exp` and clears on sign-out. (The FaceID Biometric Bypass was removed — Google OAuth is the only sign-in.)

---

## ⚙️ Configuration & Environment
* **Environment variables**: Use Vite environment variables (`import.meta.env.VITE_GOOGLE_CLIENT_ID`) for client-side keys.
* **Strict Git Exclusion**: Never commit `.env` or `.env.*` files to Git. Keep them ignored via `.gitignore`.

---

## 🚀 CI/CD & Deployment
* **Pipeline Integration**: Ensure every merge or PR passes lint + type-check + production build on GitHub Actions via the `Build & Test Verification` job in `.github/workflows/ci-cd.yml`.
* **Dynamic Key Injection**: The pipeline generates a temporary `.env` from GitHub Secrets. Because Vite inlines env at **build time**, all client keys are required: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GEMINI_API_KEY`, and optional `VITE_GEMINI_MODEL`. (No `GOOGLE_CLIENT_SECRET` — the client uses the GSI ID-token flow, which has no secret.)
* **Cloud Build upload**: `gcloud run deploy --source .` builds via the `Dockerfile`, so the generated `.env` must reach the container build. `.gcloudignore` deliberately does **not** exclude `.env` (gcloud ignores `.gitignore` when `.gcloudignore` exists). These are client-public keys — restrict them by API/HTTP-referrer.
* **Deployments**: On push to `main`, the `Deploy to Google Cloud Run` job deploys to serverless **Google Cloud Run** (`gcloud run deploy --source .`). Requires GitHub Secret `GCP_SA_KEY` (or Workload Identity Federation) and the Cloud Run + Cloud Build APIs enabled. Local equivalent: `npm run deploy:run`.
