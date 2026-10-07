# Expo Deployment Digest

## Page 1: https://docs.expo.dev/deploy/submit-to-app-stores/

**Fetched:** 2026-10-06

### EAS Submit Command & Process
- Command: `eas submit --platform android --path ./my-app.aab`
- Process: "EAS Submit uploads your .aab to Google Play Console and places it in the track you choose (internal, alpha, beta, or production)"
- Binary format required: `.aab` (Android App Bundle), must be properly signed with upload keystore

### Distribution Tracks (Android)
- Internal testing (default for new apps)
- Alpha
- Beta
- Production
- Default behavior for new apps: "the default eas submit command creates the first release on the internal testing track"

### Release Status Control
- To prevent immediate rollout: `"set releaseStatus to draft in eas.json"`
- This uploads binaries without promoting them to their designated track

### Store Listing
- **Important limitation:** "EAS Submit uploads your binary but does not manage store listing metadata, screenshots, or release notes."
- Store listing metadata, screenshots, and release notes must be configured separately in Google Play Console before or after submission

### Binary Submission
- Non-EAS builds: Use `--path` flag to specify binary location directly
- Manual first release: Alternative approach allows creating first release directly through Play Console manually (though EAS Submit is recommended)

---

## Page 2: https://docs.expo.dev/deploy/build-project/

**Fetched:** 2026-10-06

### Build Commands
- `eas build --platform android`
- `eas build --platform ios`
- `eas build --platform all` (both platforms simultaneously)
- Optional: `eas build --platform ios --message "Some message"`

### Configuration: eas.json
Minimal production configuration:
```json
{
  "build": {
    "production": {}
  }
}
```

### Developer Account Requirements
- **Android:** Google Play Developer membership ($25 USD one-time fee)
- **iOS:** Apple Developer Program membership ($99 USD annually)

### App Signing Credentials
**Android:**
- Option 1: EAS CLI to "Generate new keystore" (stored securely on EAS servers)
- Option 2: Manually generate credentials following manual Android credentials guide

**iOS:**
- Sign into Apple Developer Program account via EAS CLI prompts, or manually generate provisioning profiles and distribution certificates

### Android Build Details
- Local release builds: `./gradlew app:bundleRelease` from the android directory
- Default format: `.aab` (Android App Bundle)
- To use `.apk` instead: Set `"buildType": "apk"` in configuration

### Build Monitoring
- Via link provided by EAS CLI after build
- Or: `eas build:list` to view build history

### Automated Builds
- Configure `.eas/workflows/create-builds.yml` for automatic builds on branch commits
- Specify platform and production profile parameters

---

## Page 3: https://docs.expo.dev/build/setup/

**Fetched:** 2026-10-06

### Prerequisites
1. React Native project (or create with: `npx create-expo-app@latest my-app`)
2. Expo account (free and paid plans available)

### Installation & Authentication
- Install EAS CLI: `npm install --global eas-cli` (or `npx eas-cli@latest` per-command)
- Login: `eas login`
- Verify: `eas whoami`

### Project Setup
- Run: `eas build:configure` to set up Android or iOS for builds
- Development (recommended): `npx expo install expo-dev-client` for debug builds with hot-reload

### Additional Configuration Scenarios
- Environment variables: Add to build configuration
- Monorepo projects: Require special instructions
- Private npm packages: Require npm token configuration
- Tool version specifics (Node, Yarn, Xcode): Configure in eas.json

### Store Requirements (same as Page 2)
- **Android:** Google Play Developer account ($25 one-time fee)
- **iOS:** Apple Developer Program membership ($99 USD annually)

---

## Page 4: https://docs.expo.dev/app-signing/app-credentials/

**Fetched:** 2026-10-06

### Android Signing Certificates
- Google requirement: "Google requires all Android apps to be digitally signed with a certificate before they are installed on a device or updated."
- Keystore: Stores "a private key and its public certificate"

### Two Signing Approaches
1. **App Signing Certificate** (legacy): Direct signing with certificate attached to Play Store app
2. **Upload Certificate** (Google Play managed): Upload APK signed with upload certificate; Google Play automatically replaces with app signing certificate
- From Expo perspective: "there is no difference between whether an app is signed with an upload certificate or an app signing key"

### Manual Keystore Generation
- Can generate upload keystore manually "the same way you created your original keystore" (specific keytool commands not provided in this section)

### Keystore Recovery If Lost
Steps to restore lost keystore:
1. Download: `eas credentials` → select Android and profile → choose "Download credentials from EAS to credentials.json"
2. Export certificate: `keytool -export -rfc -alias [alias] -file certificate_for_google.pem -keystore ./path/to/keystore.jks`
3. Submit PEM file via Google's support form
4. Note: "Google will set the validity start date of the new upload certificate to 72 hours in the future"

---

## Page 5: https://docs.expo.dev/app-signing/managed-credentials/

**Fetched:** 2026-10-06

### Android Credentials Management
- Running `eas build` prompts for credentials generation if not already present
- FCM setup for push notifications: `eas credentials` → select Android → Push Notifications: Manage your FCM Api Key

### Notable Limitations
- Page does not provide: keystore generation details, Google Play service account configuration, manual signing credential setup instructions, or specific eas.json keys for Android
- Refers to related pages: App Signing guide and Security guide for comprehensive Android credential information

---

## Android / Google Play Specifics

### Command Summary
- **Build:** `eas build --platform android`
- **Submit:** `eas submit --platform android --path ./my-app.aab`
- **Local release build:** `./gradlew app:bundleRelease` from android directory
- **Credentials:** `eas credentials` (for credentials management including FCM)
- **Build history:** `eas build:list`

### Binary Format
- Default: `.aab` (Android App Bundle)
- Alternative: `.apk` (if `"buildType": "apk"` set in configuration)

### Distribution Tracks
- Internal testing (default for new apps)
- Alpha
- Beta
- Production

### Account & Fee Requirements
- Google Play Developer account: $25 USD one-time fee
- No additional service account or API key purchase required for basic submission

### Signing & Credentials
- Keystore managed by EAS or manually generated
- EAS can auto-generate and store securely on EAS servers
- Upload certificate vs app signing certificate: Expo handles both transparently
- Manual credential recovery process available via `eas credentials` command and keytool export

### Version Control
- NOT EXPLICITLY COVERED in these pages: versionCode management, autoIncrement configuration details, how versionCode is set during builds
- NOT EXPLICITLY COVERED: Google Play API credentials/service account setup for eas submit (though implied as automatic)

### First Release
- Default behavior: `eas submit` creates first release on internal testing track
- Manual option: Create first release directly in Play Console, then use EAS Submit for subsequent releases
- Both approaches supported

### Release Status
- Can set to draft in eas.json: `"set releaseStatus to draft in eas.json"` to upload without promoting to track

---

## Things NOT Possible or Requiring Manual Setup

### NOT Handled by EAS Submit
- Store listing metadata (title, description, etc.)
- Screenshots
- Release notes
- Store category, rating, pricing, distribution settings
- All must be configured manually in Google Play Console before or after submission

### Manual Steps Required
1. **First app creation:** Store listing must be created manually in Google Play Console before first EAS Submit (or EAS Submit creates first release on internal track, then store listing must complete before promotion to production)
2. **Google Play Console setup:** Account creation, app registration, and complete store listing (separate from binary submission)
3. **Credentials recovery:** If keystore lost, requires contacting Google support with certificate export and waiting 72 hours for new certificate

### NOT Explicitly Documented
- Specific versionCode increment strategies or automation
- Google Play API/service account credential setup steps (appears to be automatic via EAS CLI)
- Detailed keytool command syntax for manual keystore generation
- Build profile configuration details beyond minimal example
- Environment variable setup specifics for builds

---

**Fetch Summary**
- 5 pages fetched completely
- All pages from docs.expo.dev, fetched 2026-10-06
- No redirects encountered
- No sub-pages could not be accessed
