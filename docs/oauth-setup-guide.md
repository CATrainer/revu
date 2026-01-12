# OAuth Setup Guide for Repruv

This guide covers setting up Google and Instagram OAuth for **user sign-in** via Supabase.

> **Note:** You already have Google OAuth configured for YouTube API access. Sign-in OAuth uses the **same Google Cloud project** but requires additional configuration.

---

## Table of Contents
1. [How OAuth Sign-In Works](#how-oauth-sign-in-works)
2. [Existing User Behavior](#existing-user-behavior)
3. [Google Cloud Setup](#google-cloud-setup)
4. [Meta (Instagram) Setup](#meta-instagram-setup)
5. [Supabase Configuration](#supabase-configuration)
6. [Environment Variables](#environment-variables)

---

## How OAuth Sign-In Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OAuth Sign-In Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User clicks "Sign in with Google/Instagram"                             │
│                    │                                                         │
│                    ▼                                                         │
│  2. Frontend redirects to: /api/v1/auth/oauth/google                        │
│                    │                                                         │
│                    ▼                                                         │
│  3. Backend redirects to Supabase OAuth URL                                 │
│                    │                                                         │
│                    ▼                                                         │
│  4. Supabase redirects to Google/Instagram login                            │
│                    │                                                         │
│                    ▼                                                         │
│  5. User authenticates with provider                                        │
│                    │                                                         │
│                    ▼                                                         │
│  6. Provider redirects back to Supabase                                     │
│                    │                                                         │
│                    ▼                                                         │
│  7. Supabase redirects to: https://your-domain.com/auth/callback            │
│     (with access_token and refresh_token in URL hash)                       │
│                    │                                                         │
│                    ▼                                                         │
│  8. Frontend extracts tokens, calls: POST /api/v1/auth/oauth/callback       │
│                    │                                                         │
│                    ▼                                                         │
│  9. Backend creates/links user, returns app tokens                          │
│                    │                                                         │
│                    ▼                                                         │
│  10. User is redirected to appropriate page (onboarding or dashboard)       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Existing User Behavior

**Q: What happens if a user signs in with Google and already has an account with the same email?**

**A:** They are logged into their existing account. The OAuth flow:
1. Gets the user's email from Google/Instagram
2. Checks if a user with that email exists in the database
3. If YES → Logs them into the existing account (preserves all data)
4. If NO → Creates a new account and starts onboarding

This means:
- Users can sign up with email/password, then later sign in with Google (if same email)
- Users can sign up with Google, then later sign in with email/password (if they set one)
- Account data is never duplicated

---

## Google Cloud Setup

You already have a Google Cloud project with OAuth configured for YouTube. We'll extend it for Sign-In.

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project (the one with YouTube API enabled)

### Step 2: Configure OAuth Consent Screen (if not already done)

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Ensure the following are configured:
   - **User Type:** External (for production) or Internal (for testing)
   - **App name:** Repruv
   - **User support email:** Your support email
   - **App logo:** (optional but recommended)
   - **App domain:** repruv.co.uk
   - **Authorized domains:** repruv.co.uk
   - **Developer contact:** Your email

3. Under **Scopes**, ensure these are added:
   - `openid` (required for Sign-In)
   - `email` (required for Sign-In)
   - `profile` (required for Sign-In)
   - Your existing YouTube scopes remain unchanged

### Step 3: Create OAuth Credentials for Supabase

> **Important:** You need a **separate OAuth credential** for Supabase Sign-In. Don't modify your existing YouTube OAuth credentials.

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Configure:
   - **Application type:** Web application
   - **Name:** `Repruv Supabase Auth` (to distinguish from YouTube OAuth)
   - **Authorized JavaScript origins:**
     ```
     https://your-project-ref.supabase.co
     ```
   - **Authorized redirect URIs:**
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```
     
   > Replace `your-project-ref` with your actual Supabase project reference (found in Supabase dashboard URL)

4. Click **CREATE**
5. **Save the Client ID and Client Secret** - you'll need these for Supabase

### Step 4: Verify Your Domain (Production)

> **Note:** If you already verified your domain for YouTube OAuth, you can **skip this step**. Domain verification is done at the project level and applies to all OAuth credentials in the project.

For production, Google requires domain verification:

1. Go to **APIs & Services** → **OAuth consent screen**
2. Under **App domain**, add `repruv.co.uk`
3. Click **Add domain** and follow verification steps
4. You may need to add a TXT record to your DNS or upload a file to your server

### Summary: Google Cloud Credentials

After setup, you'll have TWO OAuth credentials:

| Credential | Purpose | Redirect URI |
|------------|---------|--------------|
| Existing (YouTube) | YouTube API access | `https://api.repruv.co.uk/api/v1/youtube/connect/callback` |
| New (Supabase) | User Sign-In | `https://your-project-ref.supabase.co/auth/v1/callback` |

---

## Meta (Facebook/Instagram) Setup

> **Note:** Supabase uses **Facebook Login** for Instagram authentication. When users click "Sign in with Instagram" in Repruv, they authenticate via Facebook's OAuth system.

### Step 1: Create Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Log in with your Facebook account
3. If prompted, complete the developer registration

### Step 2: Create a New App

1. Click **My Apps** (top right) → **Create App**
2. You'll see the new app creation flow:
   - **What do you want your app to do?** → Select **Allow people to log in with their Facebook account**
   - Click **Next**
3. **App Details:**
   - **App name:** `Repruv`
   - **App contact email:** Your email
   - **Business portfolio:** Select one or create new (optional for testing)
4. Click **Create App**

### Step 3: Configure Facebook Login Settings

After app creation, you'll be in the app dashboard:

1. In the left sidebar, click **Use cases** → **Customize** (under "Authentication and account creation")
2. Or navigate to: **Facebook Login** → **Settings** in the left sidebar
3. Find **Valid OAuth Redirect URIs** and add:
   ```
   https://vbbtlcwxapbtmqdkexcq.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project reference)
4. Ensure these are enabled:
   - ✅ **Client OAuth login** = Yes
   - ✅ **Web OAuth login** = Yes
5. Click **Save Changes**

### Step 4: Get Your App Credentials

1. In the left sidebar, click **App settings** → **Basic**
2. You'll see:
   - **App ID** - Copy this
   - **App secret** - Click **Show**, enter your Facebook password, then copy
3. Save both values - you'll need them for Supabase

### Step 5: Add Test Users (Development Mode)

While your app is in Development mode, only approved users can log in:

1. In the left sidebar, click **App roles** → **Roles**
2. Under **People**, click **Add People**
3. Enter the Facebook profile name or email of testers
4. Select role: **Tester** or **Developer**
5. Click **Add**
6. The person must accept the invitation from their Facebook account

**Alternative - Use Test Users:**
1. Go to **App roles** → **Test Users**
2. Click **Create** to generate test accounts
3. Use these accounts to test the login flow

### Step 6: Go Live (Production)

To allow any Facebook user to log in:

1. Go to **App settings** → **Basic**
2. Fill in required fields:
   - **Privacy Policy URL:** `https://www.repruv.co.uk/privacy`
   - **Terms of Service URL:** `https://www.repruv.co.uk/terms` (optional)
   - **App Icon:** Upload a 1024x1024 image
   - **Category:** Select appropriate category
3. At the top of the page, find the **App Mode** toggle
4. Switch from **Development** to **Live**
5. Confirm the switch

> **Note:** For basic login (email + public profile), you typically don't need App Review. The `email` and `public_profile` permissions are granted by default.

---

## Supabase Configuration

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Configure Google Provider

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Fill in:
   - **Client ID:** (from Google Cloud - the Supabase Auth credential)
   - **Client Secret:** (from Google Cloud - the Supabase Auth credential)
5. Note the **Callback URL** shown - this should match what you configured in Google Cloud
6. Click **Save**

### Step 3: Configure Facebook Provider (for Instagram login)

1. Go to **Authentication** → **Providers**
2. Find **Facebook** and click to expand
3. Toggle **Enable Sign in with Facebook** to ON
4. Fill in:
   - **Facebook Client ID:** (App ID from Meta)
   - **Facebook Client Secret:** (App Secret from Meta)
5. Note the **Callback URL** shown - this should match what you configured in Meta
6. Click **Save**

### Step 4: Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL:** `https://repruv.co.uk` (your production frontend)
3. Under **Redirect URLs**, add:
   ```
   https://repruv.co.uk/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

### Step 5: Get Supabase Credentials

You should already have these in your environment, but verify:

1. Go to **Settings** → **API**
2. Note:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Environment Variables

### Backend (.env)

Your existing Supabase variables should work. Verify these are set:

```env
# Supabase (existing)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://repruv.co.uk

# Google OAuth for YouTube (existing - keep these)
GOOGLE_CLIENT_ID=your-youtube-client-id
GOOGLE_CLIENT_SECRET=your-youtube-client-secret
GOOGLE_REDIRECT_URI=https://api.repruv.co.uk/api/v1/youtube/connect/callback
```

> **Note:** The Google Sign-In credentials are configured in Supabase, not in your backend environment. Your backend only needs the Supabase credentials.

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.repruv.co.uk
```

---

## Testing Checklist

### Google Sign-In
- [ ] Created separate OAuth credential in Google Cloud for Supabase
- [ ] Added Supabase callback URL to authorized redirect URIs
- [ ] Configured Google provider in Supabase dashboard
- [ ] Added `openid`, `email`, `profile` scopes to consent screen
- [ ] Test: Click "Sign in with Google" → Redirects to Google → Returns to app

### Instagram Sign-In
- [ ] Created Meta Developer app
- [ ] Added Instagram Basic Display product
- [ ] Configured redirect URIs in Meta dashboard
- [ ] Added test users (for development)
- [ ] Configured Instagram provider in Supabase dashboard
- [ ] Test: Click "Sign in with Instagram" → Redirects to Instagram → Returns to app

### General
- [ ] New users are created with `approval_status: pending`
- [ ] Existing users (same email) are logged into their account
- [ ] Users are redirected to correct page after OAuth (onboarding vs dashboard)

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- The redirect URI in your OAuth request doesn't match what's configured in Google/Meta
- Check that Supabase callback URL exactly matches the authorized redirect URI

### "Access blocked: App not verified" (Google)
- Your app is in testing mode and the user isn't a test user
- Add the user as a test user in Google Cloud Console, OR
- Complete the OAuth consent screen verification process

### "App not active" (Instagram)
- Your Meta app is in development mode
- Add the user as a test user, OR
- Complete app review and switch to live mode

### User not created after OAuth
- Check backend logs for errors in `/auth/oauth/callback`
- Verify Supabase credentials are correct
- Check that the email is being returned from the OAuth provider

---

## Architecture Notes

### Why Two Google OAuth Credentials?

| Feature | YouTube API | Sign-In |
|---------|-------------|---------|
| Purpose | Access user's YouTube data | Authenticate user identity |
| Scopes | `youtube.force-ssl` | `openid`, `email`, `profile` |
| Redirect | Your backend | Supabase |
| Token Storage | Your database | Supabase handles it |

Using separate credentials keeps concerns separated and makes debugging easier.

### Why Supabase for Sign-In?

1. **Security:** Supabase handles token management, refresh, and security best practices
2. **Simplicity:** No need to implement OAuth flows from scratch
3. **Multiple Providers:** Easy to add more providers (Apple, Twitter, etc.)
4. **Session Management:** Built-in session handling

Your YouTube OAuth remains separate because you need direct API access with specific scopes that Supabase doesn't handle.
