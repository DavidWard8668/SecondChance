# Credentials Directory

This directory is for storing sensitive credentials locally.

## ⚠️ IMPORTANT SECURITY NOTES

1. **NEVER commit files in this directory to Git**
2. The `.gitignore` file should exclude this entire directory
3. Store only local development credentials here
4. Use different credentials for production

## Recommended Files to Store Here:

### 1. Google Play Store Service Account Key
- Filename: `play-store-key.json`
- How to get it:
  1. Go to Google Play Console
  2. Settings → API access
  3. Create new service account
  4. Download JSON key

### 2. Android Keystore
- Filename: `release.keystore`
- Generate with:
  ```bash
  keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
  ```

### 3. Firebase Service Account (if using)
- Filename: `firebase-admin.json`
- Get from Firebase Console → Project Settings → Service Accounts

## Directory Structure:
```
credentials/
├── README.md (this file)
├── play-store-key.json
├── release.keystore
├── firebase-admin.json
└── .gitignore
```

## For Production:
Use proper secret management services:
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- HashiCorp Vault
- Environment variables in your hosting platform