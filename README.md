# Mamori AI - Personal Disaster Co-pilot 🛡️安心守り

A premium, offline-first, multi-agent disaster co-pilot with a strict human-approval safety gate. Designed to deliver an immersive, high-fidelity experience for the **Gemini AI Hackathon @ Google Japan (Shibuya Stream)**.

Unlike generic broadcaster systems, **Mamori AI** acts as a personal advisor—analyzing the JMA live feed, factoring in personal constraints (language, floor level, children, mobility), routing safe paths, translating critical Japanese signage, and drafting an emergency SMS to family with an active location tracker.

---

## 🛠️ The Tech Stack (Hackathon Powerhouse)

* **Framework**: React 19 + TypeScript (Scaffolded with Vite for sub-second hot reloads)
* **Styling**: **Tailwind CSS v4** (The latest, ultra-fast CSS utility-first framework)
* **Icons**: **Lucide React** (Premium, clean vector outline icons)
* **Progressive Web App (PWA)**: **Vite PWA Plugin** (Configured with automated Service Workers, caching, custom splash screens, and standalone fullscreen capabilities)
* **Target Audience**: Built for Japan's high-density urban areas, with deep focus on foreign-language residents and tourists (supports English, Chinese, Vietnamese, and Japanese).

---

## 🚀 Getting Started

### 1. Local Development
Start the ultra-fast local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) on your laptop.

### 2. Compile Standalone Production PWA
To build the fully optimized, production-ready bundle with assets, manifest configurations, and offline-caching service workers:
```bash
npm run build
```
This generates the standalone files inside the `dist/` directory.

---

## 🌐 Instant Live Deployments (The Stage QR Playbook)

To let the judges scan a QR code and use Mamori AI directly on their personal iPhones/Androids, deploy the app live in seconds:

### Path A: Zero-Config Vercel Deployment (Highly Recommended)
Deploy to Vercel instantly without installing any global packages:
```bash
npx vercel
```
* **Process**: Vercel will guide you through a quick 3-question terminal prompt. Select **Yes** for everything. 
* **Outcome**: It compiles, uploads, and gives you a live production URL (`https://your-project.vercel.app`) in under 30 seconds.

### Path B: Netlify Deployment
To deploy directly using Netlify:
```bash
npx netlify-cli deploy --dir=dist --prod
```

---

## 🏆 The Shibuya Hackathon Presentation Playbook

Maximize your 2-minute pitch window with this high-reliability workflow:

### Step 1: The Projector Showcase (iOS Simulator)
During the pitch, do not worry about physical screen sharing lag. Run the native-looking **Xcode iOS Simulator** on your Mac:
1. Open the Simulator: `open -a Simulator` (or open Xcode ➔ Developer Tools ➔ Simulator).
2. Open Safari in the Simulator and load your local address: `http://localhost:5173`.
3. Present this screen on the stage projector. It looks 100% like a native iPhone app and is immune to network drops.

### Step 2: The Judge's Hands-On (The QR Magic)
1. Convert your live Vercel/Netlify URL into a QR code (using any free online QR generator).
2. Place this QR code on your **Final Slide**.
3. Instruct the judges: *"Scan the QR code with your iPhone, tap 'Share', and select 'Add to Home Screen'."*
4. The judges will get a full-screen, responsive mobile app running natively on their own phones, with custom splash screens and offline support, blowing away the competition.
