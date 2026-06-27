# Mamori AI - Personal Disaster Co-pilot (Flutter Edition) 🛡️安心守り

A premium, Google-native, multi-agent disaster co-pilot with a strict human-approval safety gate. Designed to deliver an immersive, high-fidelity mobile experience for the **Gemini AI Hackathon @ Google Japan (Shibuya Stream)**.

Written entirely in **Flutter/Dart**, this project leverages Google's flagship cross-platform framework. It is designed to be run as an iOS/Android native app, as well as a standalone **Progressive Web App (PWA)** hosted on **Google Firebase Hosting**—offering a unified, Google-native stack that judges will love.

---

## 🛠️ The Tech Stack (Google Flagship Powerhouse)

* **Framework**: **Flutter 3.x** (Written in Dart)
* **Design Language**: Material 3 Dark + Cupertino iOS Styling details
* **Gemini SDK**: `google_generative_ai` (The official Google Generative AI Dart package)
* **PWA Engine**: Flutter CanvasKit WebAssembly renderer for smooth 60fps mobile-like graphics in standard phone browsers
* **Deployment**: **Google Firebase Hosting** (Secure Google Cloud hosting)

---

## 🚀 Getting Started

### 1. Run the local dev server (Chrome/Web PWA)
Navigate to your project directory and execute:
```bash
flutter run -d chrome
```

### 2. Run on the iOS Simulator (For Stage Presentation)
To show a gorgeous native iOS frame on the stage projector:
1. Open the Simulator on your Mac: `open -a Simulator`
2. Run the Flutter app:
   ```bash
   flutter run -d iphonesimulator
   ```

### 3. Compile Standalone Production PWA
To generate the optimized static files, assets, and service workers using the high-performance CanvasKit engine:
```bash
flutter build web --release --web-renderer canvaskit
```
*The build will be created inside the `build/web/` folder.*

---

## 🌐 Google-Native Deployment Playbook (Firebase Hosting)

Link your project and push it to Google Cloud CDN:

### Step 1: Log in to your Google Account
```bash
npx firebase-tools login
```

### Step 2: Link your Firebase Project
Create a project on the [Firebase Console](https://console.firebase.google.com/), then link it:
```bash
npx firebase-tools use --add
```
*Select your newly created project from the list, give it an alias (like `default`), and hit Enter.*

### Step 3: Compile and Deploy!
Build and publish your site with two simple commands:
```bash
flutter build web --release --web-renderer canvaskit
npx firebase-tools deploy
```
*Firebase will give you your permanent, live HTTPS URL: `https://<your-project-id>.web.app`.*

---

## 📱 Generating your Stage QR Code
1. Copy your `.web.app` URL.
2. Go to any free QR generator (e.g., [qr-code-generator.com](https://www.qr-code-generator.com/)) and generate a QR image.
3. Paste the QR code onto your **Final Slide**. 

During the presentation, both iPhone and Android users can scan and open your Flutter app in standalone fullscreen mode on their personal devices, with custom app icons and splash screens.
