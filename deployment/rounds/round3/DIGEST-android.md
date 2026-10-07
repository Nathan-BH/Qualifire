# Android Publishing Digest

**Fetched:** 2026-10-06 from developer.android.com  
**Agent:** Claude Code / DIGEST tier

---

## Page 1: General Publishing Overview
**Final URL:** https://developer.android.com/studio/publish

### Two-Step Publishing Process
- **Prepare** the app for release (build release version, configure settings)
- **Release** to users via marketplace or website

### Release Build Requirements
- Disable logging: remove all `Log` method calls
- Set `debuggable = false` (Kotlin: `isDebuggable = false`, Groovy: `debuggable false`)
- Set `versionCode` and `versionName`
- Test on at least one handset device + one tablet device
- Use Firebase Test Lab for multi-device testing

### Google Play Release (Mandatory since August 2021)
- **New apps must publish as Android App Bundle (AAB)**, not APK
- **Existing TV apps required to publish as AAB** since June 2023
- Apps larger than 200 MB must use Play Feature Delivery or Play Asset Delivery
- Three-step process: prepare materials → configure options & upload → publish
- Access to in-app billing, app licensing, analytics, distribution controls

### Release via Website
- Host APK on website, provide download link
- Users must enable "Install unknown apps" (Android 8.0+) or "Unknown sources" (API 25-)
- Developer must handle payments, licensing, billing

### Testing Requirements
- Minimum: one handset-sized device, one tablet-sized device
- Test UI sizing, performance, battery efficiency, realistic conditions
- Firebase Test Lab for cross-device testing

---

## Page 2: Play Policy Insights
**Final URL:** https://developer.android.com/studio/publish/insights

### Overview
Play Policy Insights provide lint checks for Google Play policy compliance within Android Studio.

### Features
- Available as lint checks in **Problems** tool window
- Run via: **Code > Inspect for Play Policy Insights**
- Includes policy overview, dos/don'ts, links to Policy Center
- **No automatic quick fixes** — requires manual review
- Available only in latest stable Android Studio channel (versions within previous 10 months; minimum Panda 1)

### CI/CD Integration
```gradle
lintChecks("com.google.play.policy.insights:insights-lint:LATEST_VERSION")
```

### Important Limitation
- Does **not** cover every Google Play policy
- Does **not** provide final app review decisions
- Always review full policy in Policy Center

**Note:** This page covers Play Policy Insights only, not Android Vitals or Play Console crash/ANR reporting.

---

## Page 3: Pre-Launch Preparation Checklist
**Final URL:** https://developer.android.com/studio/publish/preparing

### Certificate Validity Requirement
- **Critical:** App certificate must be valid until **October 22, 2033** or later
- Recommended: 25+ years to support full app lifespan
- New apps (August 2021+) must use Play App Signing

### Developer Verification (Starting 2026)
- All apps must be registered by verified developers for installation on certified Android devices

### Five-Task Checklist

#### 1. Gather Materials
- Cryptographic keys for signing
- App icon meeting Material Design guidelines
- High-resolution Play Store icon (if applicable)
- EULA (recommended)
- Promotional materials & screenshots (for Play)

#### 2. Configure App for Release
- **Application ID** (immutable after distribution): Set in module-level `build.gradle.kts`
- **Disable debugging**: `isDebuggable = false` (release build)
- **Code cleanup:**
  - Remove all `Log` method calls
  - Remove `Debug` tracing calls (`startMethodTracing()`, `stopMethodTracing()`)
  - Remove test log files and static test files
  - Disable WebView debugging if displaying paid content: `WebView.setWebContentsDebuggingEnabled(false)`
- **Enable app shrinking** for release builds (removes unused code/resources, reduces DEX size)
- **Project directory cleanup:**
  - `cpp/`: Only NDK source files (C/C++, headers, makefiles)
  - `lib/`: Only third-party/private libraries (no test libraries)
  - `src/`: Only source files (Java, Kotlin, AIDL) — **no JAR files**
  - `res/`: Remove old/unused drawable, layout, values files
  - `assets/` and `res/raw/`: Review and update static files

- **Manifest & build configuration review:**
  - Required: `android:icon` and `android:label` in application element
  - Specify only relevant and required permissions
  - Set `minSdk`, `targetSdk`, `versionCode`, `versionName`
  
- **API Level & Compatibility:**
  - Set appropriate `minSdk`
  - Set `targetSdk` to latest stable Android version
  - Support multiple screen configurations (tablets, foldables)
  - Use Jetpack libraries for cross-version compatibility

- **URL Configuration:** Update all server/service URLs from test to production

- **Licensing (Google Play):** For paid apps, implement Google Play Licensing Service (optional but recommended)

#### 3. Build Release APK/AAB
- Use Android Studio's integrated Gradle build system
- Automatically signs with private key, applies zipalign
- Output location: `build/outputs/` directory
- Configure CI system for automation if needed

#### 4. Prepare External Resources
- Verify remote servers are production-ready and secure
- Ensure in-app billing signature verification on remote server
- Verify all remote content feeds current and production-ready

#### 5. Test Release Build
- Test on minimum one handset device + one tablet device
- Verify UI elements properly sized
- Verify performance and battery efficiency acceptable
- Test under realistic device and network conditions
- Use Firebase Test Lab for multi-device testing

---

## Page 4: App Versioning
**Final URL:** https://developer.android.com/studio/publish/versioning

### versionCode Rules

#### Monotonic Increase (Mandatory)
- Must increase monotonically with each release
- Each successive release must use **greater value** than previous
- Higher numbers indicate more recent versions
- Android system uses versionCode to prevent downgrades

#### Maximum Value
- **Google Play maximum: 2,100,000,000** (2.1 billion)
- Must be positive integer

#### No Reuse
- **Cannot reuse a versionCode** already uploaded to Play Store
- Must always increment to new, higher value for each upload
- Exception: Multiple APKs with pre-set versionCode ranges for specific devices (see Assigning version codes documentation)

#### Typical Release Pattern
- First version: `versionCode = 1`
- Increment monotonically with each release (major or minor)
- versionCode doesn't necessarily resemble user-visible version number

### versionName Format

#### Format Specification
- **String value** displayed to users (not versionCode)
- Can be raw string or string resource reference
- Recommended format: **`<major>.<minor>.<point>`** or other absolute/relative version identifier
- Only versionName is displayed to users

#### Example
```gradle
android {
  defaultConfig {
      versionCode = 2
      versionName = "1.1"  // Displayed to users
  }
  productFlavors {
      demo {
          versionName = "1.1-demo"  // Override for demo flavor
      }
  }
}
```

### Play Store Version Requirements
1. No duplicate versionCode uploads
2. Maximum versionCode: 2,100,000,000
3. Monotonic increase required
4. versionCode determines upgrade relationships

### Build Configuration Examples

**Groovy:**
```groovy
android {
  namespace 'com.example.testapp'
  compileSdk 33

  defaultConfig {
      applicationId "com.example.testapp"
      minSdk 24
      targetSdk 33
      versionCode 1        // Internal version number (not shown to users)
      versionName "1.0"    // User-visible version string
  }
}
```

**Kotlin:**
```kotlin
android {
  namespace = "com.example.testapp"
  compileSdk = 33

  defaultConfig {
      applicationId = "com.example.testapp"
      minSdk = 24
      targetSdk = 33
      versionCode = 1      // Internal version number (not shown to users)
      versionName = "1.0"  // User-visible version string
  }
}
```

---

## Page 5: Play App Signing
**Final URL:** https://developer.android.com/studio/publish/app-signing

### Overview
Play App Signing is Google's key management system. **Mandatory for new apps since August 2021**; optional for apps created before August 2021.

#### Core Benefits
- Support for Android App Bundles and advanced delivery
- Enhanced security with Google's KMS infrastructure
- Separate upload and app signing keys capability
- Key upgrade capability for compromised/weaker keys
- Upload key reset if lost or compromised

### Key Types and Roles

#### App Signing Key
- **Purpose:** Signs APKs for installation on user devices
- **Ownership:** Managed by Google (stored on Google infrastructure)
- **Retrieval:** Cannot be retrieved after configuration
- **Retention:** Google may retain backup for disaster recovery
- **Validity:** Must be valid for app's entire lifespan
- **Sharing:** Public certificate can be shared with API providers

#### Upload Key
- **Purpose:** Signs app bundles/APKs before uploading to Play Console
- **Ownership:** You retain and maintain this key
- **Security:** Can be reset if lost or compromised
- **Generation Options:**
  1. Google generates automatically during first release
  2. You provide existing app signing key
  3. You generate new upload key during/after opting in (recommended)

**Best Practice:** Keep upload key and app signing key separate for enhanced security.

### Certificate/Key Validity Requirement
- **Minimum validity:** Until **October 22, 2033**
- **Recommended:** 25+ years to support full app lifespan

### Configuration for New Apps

**High-level steps:**
1. Generate upload key and keystore
2. Sign app with upload key
3. Configure Play App Signing in Play Console
4. Upload app to Google Play
5. Prepare and roll out release

**In Play Console:**
```
Release > Setup > App signing section:
- Option 1: Let Google generate app signing key (default)
- Option 2: Use same key as another app in account
- Option 3: Export and upload your own signing key
```

### Generating Upload Keys in Android Studio

**Method: Build > Generate Signed Bundle/APK**

1. Select Android App Bundle or APK, click Next
2. Click **Create new** below "Key store path"
3. **Keystore Configuration:**
   - Key store path: Select location with `.jks` extension
   - Password: Create secure keystore password
4. **Key Configuration:**
   - Alias: Identifying name for key
   - Password: Secure key password (should match keystore password)
   - **Validity (years):** Minimum 25 years (must extend to October 22, 2033)
   - Certificate: Your identifying information (name, location)

### Signing Your App for Release

**Full process:**
1. Open Build > Generate Signed Bundle/APK
2. Select Android App Bundle or APK, click Next
3. Select module from dropdown
4. Specify:
   - Path to keystore
   - Key alias
   - Keystore password
   - Key password
5. Click Next
6. Select destination folder, build type, product flavors (if applicable)
7. For APK: Select Signature Versions
8. Click Create

**Output location:** `build/outputs/` directory

### Upload Key Management

#### Reset Lost or Compromised Upload Key
1. Sign in to Play Console
2. Navigate to app > Release > Setup > App signing
3. Request upload key reset
4. Create new upload key following standard generation process
5. Register new certificate when prompted

**Important:** Resetting upload key does **NOT** affect app signing key used for re-signing APKs to users.

#### Generate and Register Upload Certificate
```bash
$ keytool -export -rfc
  -keystore your-upload-keystore.jks
  -alias upload-alias
  -file output_upload_certificate.pem
```

### Automatic Signing Configuration in Android Studio

1. Right-click app in Project window > Open Module Settings
2. Navigate to Project Structure window
3. Select module under Modules in left panel
4. Click Signing tab, then Add
5. Select keystore file and enter:
   - Signing configuration name
   - Required credentials (keystore password, key password, key alias)
6. Click Build Types tab
7. Click release build
8. Under Signing Config, select configuration created
9. Click OK

**Outcome:** Release builds automatically sign when built via Build > Build Bundle(s) / APK(s)

### Gradle Configuration Example

**Groovy:**
```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        config {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.config
        }
    }
}
```

**Kotlin:**
```kotlin
import java.util.Properties
import java.io.FileInputStream

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
keystoreProperties.load(FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        create("config") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("config")
        }
    }
}
```

### Secure Key Management

#### Critical Practices
- Select strong passwords for keystore and key
- Keep keystore file in safe, secure location
- Maintain validity period exceeding app lifespan
- Use separate upload and app signing keys
- Store sensitive information separately from build files

#### Consequences of Key Compromise
- Attacker can sign and distribute malicious apps under your identity
- Attacker can replace authentic apps or corrupt them
- Attacker can target other apps/systems
- Loss of developer reputation and user trust

#### Consequences of Key Loss
- Cannot publish updates to existing app (if self-managing key)
- Cannot regenerate previously generated key
- **Play App Signing mitigation:** Can reset upload key and continue updates

### Remove Sensitive Information from Build Files

**Step 1:** Create `keystore.properties` in project root:
```properties
storePassword=myStorePassword
keyPassword=mykeyPassword
keyAlias=myKeyAlias
storeFile=myStoreFileLocation
```

**Step 2:** Reference in `build.gradle` (before android block):
**Groovy:**
```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
```

**Kotlin:**
```kotlin
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
keystoreProperties.load(FileInputStream(keystorePropertiesFile))
```

**Step 3:** Reference properties in signingConfigs using: `keystoreProperties['propertyName']`

**Step 4:** Remove `keystore.properties` from source control; keep it secure locally or on build server

### Key Upgrade Procedures

#### Upgrade App Signing Key (Scenarios)
- Existing key compromised
- Migration to cryptographically stronger key
- Security requirements changes

**Platform Support:**
- **Android 13+:** Uses new key for installs and updates
- **Earlier Android versions:** Uses older app signing key for updates to ensure compatibility

**Process:** Available through Play Console > App signing section

**Key Point:** Old key remains valid for older Android versions to ensure update compatibility.

### Why Sign with Same Certificate Throughout Lifespan
- **App Upgrade:** System compares certificates; must match for seamless update
- **Different Certificate:** User must install as new app with different package name
- **App Modularity:** APKs signed by same certificate can run in same process
- **Code/Data Sharing:** Signature-based permissions enable secure inter-app sharing

---

## Page 6: Uploading App Bundles
**Final URL:** https://developer.android.com/studio/publish/upload-bundle

### Prerequisites

#### Play App Signing Enrollment (Mandatory)
- Required for all new apps since August 2021
- Must enroll before uploading

#### Size Requirements
- Google Play supports cumulative total download size of **4 GB**
- Includes all modules and install-time asset packs

#### App Signing
- App must be signed for release before upload

### Upload Process

**Basic steps:**
1. Prepare signed AAB
2. Access Play Console
3. Upload bundle following Play Console workflow
4. Full instructions: https://support.google.com/googleplay/android-developer/answer/7159011

### Post-Upload: APK Inspection

Play Console automatically:
- Generates split APKs for different device configurations
- Creates multi-APKs for all supported devices
- Viewable via "Latest releases and bundles" page

**You can:**
- See all APK artifacts generated by Google Play
- Inspect supported devices per APK
- View APK size savings data
- Download generated APKs for local testing

### Testing Tracks

#### Internal Testing Options

**Firebase App Distribution:**
- Deploy any build type
- Distribute to specific users/testers
- Ideal for CI/CD pipelines
- Benefits: Flexible build types, targeted distribution

**Play Console Internal App Sharing:**
- Faster deployment than alpha/beta tracks
- Access to monetization services (Subscriptions, In-App Purchases, Ads)
- Goes through Play Console signing and shrinking
- Closest representation to production distribution
- Option to defer Play Store review
- **Note:** Review still required before full production release

### Updating Your App Bundle

1. **Increase versionCode** in base module:
   ```gradle
   versionCode X+1
   ```

2. **Build new app bundle**

3. **Upload new bundle** to Play Console

4. **Play Console automatically:**
   - Generates updated APKs with new version codes
   - Serves them to users as needed

---

## Page 7: Troubleshooting
**Final URL:** https://developer.android.com/studio/troubleshoot

### Build & Network Issues

#### Project Sync: "Permission denied: connect"
**Solution:** Add IPv4 stack preference to `gradle.properties`:
```properties
org.gradle.jvmargs=-Djava.net.preferIPv4Stack=true
```

If you have existing JVM arguments:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -Djava.net.preferIPv4Stack=true
```

Restart Android Studio and sync with Gradle.

### Windows Update Issues

#### Problems Updating the IDE on Windows
**Issue:** Update fails with "Can't delete C:\some\path\file"

**Solution:** Open Task Manager and kill processes using the files (e.g., Gradle daemons) before attempting update.

### API Level & Library Issues

#### minSdkVersion Conflicts
**Problem:** Error using obsolete Android Support Libraries:
```
uses-sdk:minSdkVersion 19 cannot be smaller than version L declared in library
```

**Solution:** Use SDK Manager to update to latest non-preview versions of Android Support Libraries.

### Android Studio Startup Issues

#### Studio doesn't start after installing version 4.2
**Cause:** IDE fails to import and sanitize previous `*.vmoptions` for JDK 11 garbage collector

**Workaround:** Comment out custom options in `*.vmoptions` using "#" character

**File locations:**
- **Windows:** `C:\Users\YourUserName\AppData\*[Local|Roaming]*\Google\AndroidStudio4.2\studio64.exe.vmoptions`
- **macOS:** `~/Library/Application Support/Google/AndroidStudio4.2/studio.vmoptions`
- **Linux:** `~/.config/Google/AndroidStudio4.2/studio64.vmoptions`

#### Studio doesn't start after upgrade
**Cause:** Invalid configuration from previous version or incompatible plugin

**Workaround:** Delete/rename configuration directory to reset to default

**Directories (Android Studio 4.1+):**
- **Windows:** `%APPDATA%\Google\AndroidStudio*<version>*`
- **macOS:** `~/Library/Application Support/Google/AndroidStudio*<version>*`
- **Linux:** `~/.config/Google/AndroidStudio*<version>*` and `~/.local/share/Google/AndroidStudio*<version>*`

**Directories (Android Studio 4.0 and earlier):**
- **Windows:** `%HOMEPATH%\.AndroidStudio*<version>*\config`
- **macOS:** `~/Library/Preferences/AndroidStudio*<version>*`
- **Linux:** `~/.AndroidStudio*<version>*/config`

### Other Troubleshooting Topics (Index)
- High-density displays (scaling on Mac/Windows/Linux, HiDPI/Retina, blurry elements)
- Android Emulator troubleshooting (see dedicated documentation)

---

## Page 8: Known Issues
**Final URL:** https://developer.android.com/studio/known-issues

### Critical Build & Signing Issues

#### Gradle Sync Failed: Broken Pipe
**Cause:** Gradle daemon trying to use IPv4 instead of IPv6

**Workaround 1 (Linux):** Add to `~/.profile` or `~/.bash_profile`:
```bash
export _JAVA_OPTIONS="-Djava.net.preferIPv6Addresses=true"
```

**Workaround 2:** In Android Studio's `vmoptions` file, change:
```
-Djava.net.preferIPv4Addresses=true
```
to:
```
-Djava.net.preferIPv6Addresses=true
```

#### Different Passwords for Key and Keystore
**Affected Versions:** Android Studio 4.2+ (runs on JDK 11)

**Issue:** When signing APK/bundle with different key and keystore passwords:
```
Key was created with errors:
Warning: Different store and Key passwords not supported for PKCS12 Key stores
```

**Workaround:** Use the same password for both key and keystore

### Gradle & AGP Compatibility

#### Run Configuration Without Gradle-aware Make
**Issue:** Projects opened with Android Studio Ladybug Feature Drop Canary 9 lost run configuration information, causing "loading build artifacts" error

**Solution:** Verify active run configuration has "Gradle-aware Make" step in "Before launch" section via Run/Debug Configurations > Edit Configurations

**Note:** Android Studio cannot auto-fix as some configurations may intentionally lack this step.

#### Modifying Variant Outputs at Build Time
**Issue:** Complicated tasks accessing `outputFile` objects no longer work; variant-specific tasks no longer created during configuration stage

**Workaround:** Use `processManifest.manifestOutputDirectory()` instead of `manifestOutputFile()`:

```gradle
android.applicationVariants.all { variant ->
    variant.outputs.all { output ->
        output.processManifest.doLast {
            String manifestPath = "$manifestOutputDirectory/AndroidManifest.xml"
            def manifestContent = file(manifestPath).getText()
            manifestContent = manifestContent.replace('android:versionCode="1"',
                    String.format('android:versionCode="%s"', generatedCode))
            file(manifestPath).write(manifestContent)
        }
    }
}
```

**Simple tasks still work:**
```gradle
android.applicationVariants.all { variant ->
    variant.outputs.all {
        outputFileName = "${variant.name}-${variant.versionName}.apk"
    }
}
```

### Certificate & HTTPS Issues

#### "peer not authenticated" errors from Gradle sync or SDK Manager
**Cause:** Missing certificate in `$JAVA_HOME/jre/lib/certificates/cacerts`

**Solutions:**
- Try connecting directly if behind proxy
- Use `keytool` to add proxy server certificate to cacerts
- Reinstall unmodified JDK
- For Ubuntu (known issue with empty cacerts):
  ```bash
  sudo /var/lib/dpkg/info/ca-certificates-java.postinst configure
  ```

### Android Studio Version Compatibility

#### Android Studio Panda 3 not compatible with IntelliJ Develocity plugin 1.2.0
**Issue:** Run action fails with error: `Found interface com.android.tools.idea.gradle.project.build.invoker.GradleBuildInvoker$Request, but class was expected`

**Affected Versions:** Android Studio Panda 3 Canary 1+

**Workaround:** Disable the Develocity IDE plugin v1.2.0 until fix is released

### AGP Specific Issues

#### Not all dynamic-feature library dependencies are lint checked
**Issue:** When running lint with `checkDependencies = true` from app module, dynamic-feature library dependencies aren't checked unless they're also app dependencies

**Workaround:** Run lint task on those libraries directly

#### AIDL Support with Kotlin 1.7.x
**Issue:** Using AGP 7.3.0 with KAPT in Kotlin 1.7.x removes AIDL source sets for specific build variants

**Workaround:** Continue using Kotlin 1.6.21 if variant-specific AIDL source sets needed

**Note:** Other AIDL source sets (main/, build types, product flavors) still work

### Other Known Issues (Topic Index)
- Kotlin 2.0: Lambdas cannot be resolved in Layout Inspector
- Apply Changes & Restart Activity issues
- Firebase assistant window errors
- Layout Inspector view isolation issues
- Compose Preview rendering errors
- Database Inspector crashes on Android 11 emulator
- Android Emulator HAXM on macOS High Sierra
- Apply Changes app name issues
- Android Runtime exceptions
- JUnit test classpath and compilation issues
- Native debugger stepping, hanging, crashing
- CPU Profiler timeout errors
- ADB exceptions during debugging/profiling
- Build Output window plugin issues
- Installation order and launch prevention
- Espresso Test Recorder with Compose
- Logcat keyboard conflicts
- UI scaling on ChromeOS
- Keyboard input freezing on Linux (iBus)
- Key mapping conflicts on Linux
- Kotlin multiplatform compilation issues

---

## Cross-Page Facts

### App Signing (Play App Signing Program)
**From:** Page 1 (General), Page 5 (App Signing)

**Key requirement:** Mandatory for all new apps since August 2021; optional for apps created before.

**Two-key system:**
- **App Signing Key:** Managed by Google, signs APKs for users, cannot be retrieved
- **Upload Key:** You maintain, can be reset if lost, signs bundles/APKs before upload to Play Console

**Certificate validity:** Must be valid until October 22, 2033 or later (recommended 25+ years)

**Best practice:** Keep upload and app signing keys separate for enhanced security

**Key management:** If upload key lost/compromised, can reset it in Play Console without affecting app signing key

**Upload key recovery:** Available via Play Console > Release > Setup > App signing section

### Versioning Rules (versionCode & versionName)
**From:** Page 4 (Versioning)

**versionCode (Internal version):**
- Must increase monotonically with each release
- Each successive release must have greater value than previous
- Maximum value: 2,100,000,000 (2.1 billion)
- Cannot reuse a versionCode already uploaded to Play Store
- Determines update relationships and prevents downgrades
- Not displayed to users

**versionName (User-visible version):**
- String value displayed to users
- Recommended format: `<major>.<minor>.<point>`
- Can be overridden per product flavor
- Only versionName shown to users, never versionCode

**Play behavior:** System uses versionCode to determine whether update is available and whether downgrade should be blocked

### Upload Flow to Play Console
**From:** Page 1 (General), Page 6 (Upload Bundle)

**Prerequisites:**
- App must be signed for release
- Play App Signing enrollment required (mandatory for new apps)
- 4 GB cumulative download size limit (all modules + asset packs)

**Basic upload process:**
1. Build signed Android App Bundle (AAB)
2. Access Play Console
3. Upload bundle via Play Console interface
4. Play Console automatically generates split APKs for different device configurations
5. View generated APKs via "Latest releases and bundles" page

**After upload:**
- Can download generated APKs for local testing
- Can inspect which devices supported by each APK
- View APK size savings data

**First upload:** Manual upload via Play Console (no automation for initial release to production)

**Updates:** Increment versionCode, build new AAB, upload to Play Console

**Testing tracks available:**
- Internal App Sharing (fastest, closest to production, goes through Play signing/shrinking)
- Firebase App Distribution (flexible build types, targeted distribution)
- Alpha/Beta/Production tracks (full release tracks)

### Pre-Launch Requirements Checklist
**From:** Page 3 (Preparing), Page 1 (General)

**Technical requirements:**
- App signed with certificate valid until October 22, 2033 or later
- `debuggable = false` (release build)
- Remove all logging and debug code (Log calls, Debug tracing, test files)
- WebView debugging disabled if displaying paid content
- App shrinking enabled for release builds

**Configuration requirements:**
- `minSdk` set appropriately
- `targetSdk` set to latest stable Android version
- `versionCode` and `versionName` configured
- Application ID immutable and set correctly
- All permissions specified (only required permissions)
- All server/service URLs updated to production

**Resource requirements:**
- App icon meeting Material Design guidelines
- High-resolution Play Store icon (if applicable)
- EULA (recommended)
- Promotional materials & screenshots (for Play)

**Project cleanup:**
- `cpp/` directory: Only NDK source files
- `lib/` directory: Only third-party/private libraries (no test)
- `src/` directory: Only source files (no JAR files)
- `res/` directory: Remove unused drawable, layout, values files
- `assets/` and `res/raw/`: Update static files for production

**Testing requirements:**
- Test on minimum one handset device + one tablet device
- Verify UI elements properly sized
- Verify performance acceptable
- Verify battery efficiency acceptable
- Test under realistic device and network conditions
- Use Firebase Test Lab for multi-device testing

**External resources:**
- Verify remote servers production-ready and secure
- Verify in-app billing signature verification on remote server
- Verify all content feeds current

### Android App Bundle vs APK
**From:** Page 1 (General)

**AAB (Android App Bundle):**
- **Mandatory for new apps on Play Store** since August 2021
- **Mandatory for all TV apps** on Play Store since June 2023
- Google Play automatically generates split APKs for different device configurations
- More efficient distribution (users download only what they need)
- Supports Play Feature Delivery and Play Asset Delivery for apps >200 MB
- Preferred for Play Store distribution

**APK (Traditional Package):**
- Can be used for apps created before August 2021
- Can be released via website (host APK, users download and install)
- Not preferred for Play Store (Play Store requires AAB for new apps)
- Users must enable "Install unknown apps" (Android 8.0+) or "Unknown sources" (API 25-)
- Developer must handle payments, licensing, billing for website distribution

