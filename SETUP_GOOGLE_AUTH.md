# Google OAuth Setup Instructions for AEGIS App

## Step 1: Access Your Base44 App Settings

1. Go to: https://app.base44.com
2. Log in to your Base44 account
3. Navigate to your AEGIS app (ID: `6abf316e513de225850faaa5`)

## Step 2: Configure Google OAuth Provider

### In Base44 Dashboard:

1. Click on your AEGIS app
2. Go to **"Settings"** or **"Authentication"** tab
3. Look for **"OAuth Providers"** or **"Social Login"** section
4. Click **"Add Provider"** or **"Configure OAuth"**
5. Select **Google** as the provider

### Google OAuth Credentials:

You need to get these from Google Cloud Console (not Clerk):

1. Go to: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable **Google+ API**
4. Go to **"Credentials"** → **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Application type: **Web application**
6. Add these redirect URIs:
   - `https://api.base44.com/apps/6abf316e513de225850faaa5/auth/callback/google`
   - `http://localhost:5173/auth/callback`
   
7. Copy your **Client ID** and **Client Secret**

### Add to Base44:

- **Provider**: Google
- **Client ID**: [Your Google OAuth Client ID]
- **Client Secret**: [Your Google OAuth Client Secret]
- **Scopes** (if asked): `email profile openid`

## Step 3: Publish Your App

After configuring OAuth:
1. Save the settings
2. **Publish** your app from the Base44 dashboard
3. Wait for deployment to complete

## Step 4: Test

1. Go to http://localhost:5173/login
2. Click "Continue with Google"
3. You should be redirected to Google's login page
4. After successful login, you'll be redirected back to your app

## Alternative: Using Clerk (If Base44 Supports It)

If Base44 has a Clerk integration option:

**Clerk Publishable Key:**
```
pk_test_dG9sZXJhbnQtc3RvcmstNTA0Ni5jbGVyay5hY2NvdW50cy5kZXYk
```

**Clerk Secret Key:**
```
sk_test_GC2eAHcvfqt3wdUA67EOQBfpgqvlTcqGbVohgRryXM
```

Add these in the Base44 Clerk integration section (if available).

## Troubleshooting

### Error 403 Forbidden
- Make sure Google OAuth is configured in Base44 dashboard
- Ensure your app is published
- Check that redirect URIs are correct

### Error 404 Not Found
- Verify the app ID is correct: `6abf316e513de225850faaa5`
- Make sure the OAuth provider is saved and published

### Error 401 Unauthorized
- Check that Client ID and Client Secret are correct
- Ensure the OAuth credentials are for a Web application type

## Contact Support

If you continue having issues:
- Base44 Support: https://app.base44.com/support
- Documentation: https://docs.base44.com/

---

**Current Status:**
- ✅ Environment variables configured
- ✅ Login page updated
- ✅ Dev server running
- ⚠️ **Google OAuth needs to be configured in Base44 dashboard**
