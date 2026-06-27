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
* **Offline Resilience**: Retain the FaceID Biometric Local Bypass. This is a crucial conceptual secondary login for emergency networks during urban disasters.

---

## ⚙️ Configuration & Environment
* **Environment variables**: Use Vite environment variables (`import.meta.env.VITE_GOOGLE_CLIENT_ID`) for client-side keys.
* **Strict Git Exclusion**: Never commit `.env` or `.env.*` files to Git. Keep them ignored via `.gitignore`.

---

## 🚀 CI/CD & Deployment
* **Pipeline Integration**: Ensure every merge or PR can pass compilation checks on GitHub Actions via the `Build & Test Verification` pipeline in `.github/workflows/ci-cd.yml`.
* **Dynamic Key Injection**: The build pipeline must dynamically generate temporary `.env` files using secrets from GitHub Secrets (`VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).
* **Deployments**: Production deployments must be compiled, containerized, and deployed to serverless **Google Cloud Run** via the native `npm run deploy:run` script.
