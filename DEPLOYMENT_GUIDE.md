# SakanArbab - Android Deployment Guide

## Prerequisites

1. **Node.js** (v18+) installed
2. **EAS CLI** installed globally:
   ```bash
   npm install -g eas-cli
   ```
3. **Expo account** — sign up at https://expo.dev
4. Login to EAS:
   ```bash
   eas login
   ```
5. Verify you're logged in:
   ```bash
   eas whoami
   ```

---

## Phase 1: Build APK for Testing

This builds a standalone `.apk` file you can install directly on any Android device.

### Step 1 — Run the build

```bash
eas build --platform android --profile preview
```

- Builds on Expo cloud servers (~10-15 minutes)
- When complete, you'll get a **download URL** for the `.apk`

### Step 2 — Install on your Android device

**Option A — Direct download:**
1. Open the download URL on your Android phone's browser
2. Go to Settings > Security > Enable "Install from unknown sources" (or "Install unknown apps" for your browser)
3. Open the downloaded `.apk` and install

**Option B — QR Code:**
1. The terminal will show a QR code after the build
2. Scan it with your phone's camera
3. Download and install the APK

**Option C — Via USB:**
1. Download the `.apk` to your computer
2. Connect your phone via USB
3. Copy the `.apk` to your phone's Downloads folder
4. Open it from a file manager and install

### Step 3 — Test thoroughly

Before submitting to the Play Store, test these critical flows:

- [ ] PIN setup and login
- [ ] Business profile creation and editing
- [ ] Add property > room > bed unit
- [ ] Create tenancy contract (verify PDF generation)
- [ ] Auto-generated PENDING payments appear
- [ ] Mark payment as PAID (from contract detail + log payment screen)
- [ ] End tenancy (blocked if payments are unpaid)
- [ ] Overdue notifications (bell icon on dashboard)
- [ ] P&L Advisory screen with month navigation
- [ ] Expenses: add, edit, delete
- [ ] Receipt PDF generation and sharing
- [ ] Backup functionality
- [ ] Lock app and sign out
- [ ] Pull-to-refresh on dashboard

---

## Phase 2: Google Play Store Deployment

### Step 1 — Create a Google Play Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the one-time **$25 USD** registration fee
4. Complete identity verification (takes 1-2 business days)

### Step 2 — Prepare Store Listing Assets

You will need the following assets ready before publishing:

| Asset                | Specification                        | Notes                              |
|----------------------|--------------------------------------|------------------------------------|
| **App Icon**         | 512 x 512 px, PNG, 32-bit           | High-res version of your app icon  |
| **Feature Graphic**  | 1024 x 500 px, PNG or JPG           | Banner shown on Play Store listing |
| **Phone Screenshots**| Min 2, max 8 (1080 x 1920 px)       | Show key screens of the app        |
| **Short Description**| Max 80 characters                    | One-line summary of the app        |
| **Full Description** | Max 4000 characters                  | Detailed app description           |
| **Privacy Policy**   | Public URL required                  | Can host on GitHub Pages           |
| **App Category**     | Business / Productivity              | Choose in Play Console             |
| **Content Rating**   | Complete the questionnaire in console| Required before publishing         |

#### Suggested Short Description
```
Bed-space rental management — contracts, payments, P&L tracking.
```

#### Suggested Full Description
```
SakanArbab is a complete property and bed-space rental management app designed for landlords and rental agents.

Key Features:
- Property Management: Organize properties, rooms, and individual bed units
- Tenancy Contracts: Create and manage tenant contracts with PDF generation
- Payment Tracking: Auto-generated monthly payment records with PAID/PENDING status
- Overdue Alerts: Instant notifications for tenants past their payment due date
- P&L Advisory: Monthly profitability reports per property with income, expenses, and net profit tracking
- Expense Management: Track property expenses by category
- PDF Documents: Professional contract and receipt PDFs with your business branding
- Secure Access: PIN-based app security
- Offline First: All data stored locally on your device using SQLite

Built for the UAE bed-space rental market. Supports multiple currencies.
```

#### Privacy Policy

You must provide a privacy policy URL. Create a simple one covering:
- What data the app collects (stored locally on device)
- No data is sent to external servers
- User controls their own data via backup/restore

Host it as a GitHub Pages site or any public URL.

### Step 3 — Build Production Release (.aab)

The Play Store requires an **Android App Bundle (.aab)**, not an APK.

```bash
eas build --platform android --profile production
```

- This creates a signed, optimized `.aab` file
- The `autoIncrement` in eas.json will automatically bump the version code

### Step 4 — Set Up Google Service Account (for auto-submit)

This is optional but recommended for future updates.

1. Go to **Google Cloud Console** > Create a project (or use existing)
2. Enable the **Google Play Android Developer API**
3. Create a **Service Account** with Editor role
4. Download the JSON key file
5. In **Play Console** > Settings > API access > Link the service account
6. Grant the service account **Release manager** permission

Then configure EAS:
```bash
eas credentials
```
Or add the key path to `eas.json`:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json"
    }
  }
}
```

> IMPORTANT: Add `google-service-account.json` to `.gitignore` — never commit this file.

### Step 5 — Submit to Play Store

**Option A — Auto-submit via EAS (recommended after Step 4):**
```bash
eas submit --platform android --profile production
```

**Option B — Manual upload:**
1. Download the `.aab` from the EAS build dashboard (https://expo.dev)
2. Go to Play Console > Your App > Production > Create new release
3. Upload the `.aab` file
4. Add release notes
5. Click "Review release" > "Start rollout to Production"

### Step 6 — Play Store Review

- **First submission:** 3-7 business days for review
- **Updates:** 1-3 business days
- You'll receive an email when the app is approved or if changes are needed

---

## Updating the App

For future updates after the initial Play Store launch:

1. Make your code changes
2. Commit and push to git
3. Build a new production release:
   ```bash
   eas build --platform android --profile production
   ```
4. Submit the update:
   ```bash
   eas submit --platform android --profile production
   ```
5. The `autoIncrement` setting will automatically bump the version code

To update the version number shown to users, change `version` in `app.json`:
```json
"version": "1.1.0"
```

---

## Build Profiles Summary

| Profile       | Command                                          | Output | Use Case           |
|---------------|--------------------------------------------------|--------|---------------------|
| `development` | `eas build --platform android --profile development` | `.apk` | Dev client + hot reload |
| `preview`     | `eas build --platform android --profile preview`     | `.apk` | Testing on device   |
| `production`  | `eas build --platform android --profile production`  | `.aab` | Play Store release  |

---

## Troubleshooting

### Build fails with dependency error
```bash
npx expo install --fix
```

### EAS CLI not found
```bash
npm install -g eas-cli
```

### Build takes too long
- Free Expo accounts have limited build queue priority
- Consider Expo paid plan for faster builds

### APK won't install
- Ensure "Install from unknown sources" is enabled
- Check that the phone's Android version is compatible (Android 6.0+)

### Play Store rejection
Common reasons:
- Missing privacy policy
- Screenshots don't match app functionality
- Content rating not completed
- App crashes during review (test thoroughly first!)

---

## Project Configuration Reference

| Setting              | Value                              | File       |
|----------------------|------------------------------------|------------|
| Package name         | `com.asaddimtimkar.SakanArbab`     | app.json   |
| Version              | `1.0.0`                            | app.json   |
| EAS Project ID       | `870732e3-0909-47b7-8f63-2bc47f0f8c10` | app.json |
| Owner                | `asaddimtimkar`                    | app.json   |
| Min EAS CLI version  | `>= 18.4.0`                        | eas.json   |
