# Supabase Configuration for Password Reset

## Required Supabase Dashboard Settings

### 1. Authentication → URL Configuration
- **Site URL**: `http://localhost:3000` (development) / `https://yourdomain.com` (production)
- **Redirect URLs**: 
  - `http://localhost:3000/reset-password`
  - `https://yourdomain.com/reset-password`

### 2. Authentication → Email Templates
- **Reset Password Template**: 
  - Subject: `Reset your password`
  - Redirect URL: `{{ .SiteURL }}/reset-password`

### 3. How the Flow Works

1. **User requests password reset**: 
   - Frontend calls `/api/v1/auth/forgot-password`
   - Backend calls Supabase's `/auth/v1/recover` endpoint
   - Supabase sends email with reset link

2. **User clicks email link**:
   - Link format: `https://yourdomain.com/reset-password#access_token=xyz&refresh_token=abc`
   - Frontend extracts tokens from URL hash
   - User enters new password

3. **Password reset submission**:
   - Frontend sends token + new password to `/api/v1/auth/reset-password`
   - Backend uses token to update password via Supabase API
   - User is redirected to login

### 4. Environment Variables Required

Backend `.env`:
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Email Template Example

Subject: `Reset your password for {{ .SiteName }}`

Body:
```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
```

The `{{ .ConfirmationURL }}` will automatically include the access token and redirect to your configured reset password page.
