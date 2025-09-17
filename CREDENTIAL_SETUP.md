# 🔐 Credential Setup Guide for SecondChance

## Overview
This guide explains how to securely set up all required credentials for the SecondChance app.

## 1. Gmail App-Specific Password (For Email Notifications)

### Steps:
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication (required)
3. Go to "App passwords" section
4. Generate new app password:
   - Select app: Mail
   - Select device: Other (Custom name)
   - Name it: "SecondChance Notifications"
5. Copy the 16-character password

### Where to store:
- **Local**: `.env` file
  ```
  SMTP_USER=exiledev8668@gmail.com
  SMTP_PASS=xxxx-xxxx-xxxx-xxxx
  ```
- **GitHub**: Settings → Secrets → Actions
  - `SMTP_USER`
  - `SMTP_PASS`

## 2. Android Signing Keystore

### Generate keystore:
```bash
cd SecondChance
mkdir -p android-keys
cd android-keys

keytool -genkey -v -keystore release.keystore \
  -alias secondchance \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

### Important: Save these details:
- Keystore password
- Key alias (secondchance)
- Key password

### Convert to Base64 for GitHub:
```bash
# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Out-File keystore.base64

# On Mac/Linux
base64 release.keystore > keystore.base64
```

### Where to store:
- **Local**: Keep in `android-keys/` folder (gitignored)
- **GitHub Secrets**:
  - `ANDROID_KEYSTORE_BASE64` (contents of keystore.base64)
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_PASSWORD`

## 3. Google Play Store Service Account

### Steps:
1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: Settings → API access
3. Click "Create new service account"
4. Follow the link to Google Cloud Console
5. Create service account:
   - Name: "SecondChance CI/CD"
   - Role: "Service Account User"
6. Create and download JSON key
7. Back in Play Console, grant permissions:
   - "Release apps to testing tracks"
   - "View app information"

### Where to store:
- **Local**: Save as `credentials/play-store-key.json`
- **GitHub Secret**: `PLAY_STORE_SERVICE_ACCOUNT_JSON` (entire JSON contents)

## 4. Setting GitHub Secrets

### Navigate to:
https://github.com/DavidWard8668/SecondChance/settings/secrets/actions

### Add these secrets:
```yaml
# Email
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: exiledev8668@gmail.com
SMTP_PASS: [app-specific password]

# IMAP (for bug monitoring)
IMAP_USER: exiledev8668@gmail.com
IMAP_PASS: [same app-specific password]
IMAP_HOST: imap.gmail.com
IMAP_PORT: 993

# Android Signing
ANDROID_KEYSTORE_BASE64: [base64 encoded keystore]
ANDROID_KEYSTORE_PASSWORD: [your keystore password]
ANDROID_KEY_ALIAS: secondchance
ANDROID_KEY_PASSWORD: [your key password]

# Play Store
PLAY_STORE_SERVICE_ACCOUNT_JSON: [entire JSON content]
```

## 5. Local Development Setup

### Create `.env` file:
```bash
cd SecondChance
cp .env.example .env
# Edit .env with your actual values
```

### Test email notifications:
```bash
cd SecondChance
npm install
node scripts/email-notifications.js test
```

### Test bug monitoring:
```bash
node scripts/email-bug-monitor.js test
```

### Test synthetic tests:
```bash
npm install puppeteer node-cron
node scripts/synthetic-user-tests.js run
```

## 6. Security Best Practices

### DO:
✅ Use different passwords for different environments
✅ Rotate credentials regularly
✅ Use app-specific passwords, never your main password
✅ Keep production credentials separate
✅ Use secret management services in production

### DON'T:
❌ Commit credentials to Git
❌ Share credentials in plain text
❌ Use the same credentials for dev/staging/prod
❌ Store credentials in code
❌ Log credentials

## 7. Verify Setup

### Check GitHub Actions:
1. Push a change to trigger workflow
2. Check Actions tab in GitHub
3. Verify emails are sent on failure

### Check local setup:
```bash
# Test email
node -e "require('./scripts/email-notifications').emailService.initialize()"

# Should see: ✅ Email service initialized successfully
# Or error with what's missing
```

## 8. Troubleshooting

### Gmail "Less secure app" error:
- Must use App-Specific Password, not regular password
- Ensure 2FA is enabled on the Google account

### GitHub Actions failing:
- Check secrets are set correctly (no extra spaces)
- Verify base64 encoding is correct
- Check secret names match exactly

### Keystore issues:
- Keep backup of keystore file (CRITICAL - can't update app without it)
- Store keystore password in password manager
- Never lose the keystore - you'd need to create new app listing

## 9. Production Considerations

For production, consider using:
- **AWS Secrets Manager** or **Google Secret Manager**
- **Dedicated email service** (SendGrid, AWS SES)
- **Monitoring service** (Datadog, New Relic)
- **Error tracking** (Sentry)

## Need Help?

If you encounter issues:
1. Check the logs in `logs/` directory
2. Review GitHub Actions logs
3. Test each component individually
4. Ensure all required npm packages are installed