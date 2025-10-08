# Early Access Email Campaign Templates

Email templates for announcing the launch of Repruv to waitlist subscribers.

## Files

- **`early-access-invite.html`** - Full-featured HTML email with rich styling and features
- **`early-access-invite-simple.html`** - Simpler, more minimal HTML version
- **`early-access-invite.txt`** - Plain text version for email clients that don't support HTML

---

## How to Use with SendGrid

### Option 1: SendGrid Marketing Campaigns (Recommended)

1. **Go to SendGrid Dashboard**
   - Navigate to **Marketing** → **Single Sends**
   - Click **Create Single Send**

2. **Setup Campaign**
   - **Name**: "Repruv Early Access Launch"
   - **Subject Line**: "Your Early Access to Repruv is Ready! 🎉"
   - **Sender**: Your verified sender identity
   - **Recipients**: Select your waitlist contact list

3. **Design Email**
   - Click **Design Editor**
   - Choose **Code Editor** (not drag & drop)
   - Copy and paste the HTML from `early-access-invite.html`

4. **Preview & Test**
   - Click **Preview** to see how it looks
   - Send a test email to yourself
   - Check on desktop, mobile, and different email clients

5. **Schedule or Send**
   - Review everything
   - Click **Send Immediately** or schedule for later

---

### Option 2: SendGrid Design Library

1. Go to **Marketing** → **Designs**
2. Click **Create a Design**
3. Select **Blank Design** → **Code Editor**
4. Paste the HTML template
5. Save the design
6. Use it when creating your campaign

---

### Option 3: API Send (Advanced)

If you prefer to send via API:

```bash
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [
      {
        "to": [{"email": "recipient@example.com"}],
        "subject": "Your Early Access to Repruv is Ready! 🎉"
      }
    ],
    "from": {"email": "noreply@repruv.co.uk", "name": "Repruv"},
    "content": [
      {
        "type": "text/html",
        "value": "YOUR_HTML_HERE"
      },
      {
        "type": "text/plain",
        "value": "YOUR_TEXT_VERSION_HERE"
      }
    ]
  }'
```

---

## Subject Line Suggestions

Choose one or customize:

1. **"Your Early Access to Repruv is Ready! 🎉"** (Recommended)
2. "You're In! Start Using Repruv Today"
3. "Repruv is Live - Your Account Awaits"
4. "Early Access Unlocked: Welcome to Repruv"
5. "The Wait is Over - Join Repruv Now"

---

## Preview Text Suggestions

The preview text appears next to the subject line in inboxes:

1. **"Thanks for waiting! Sign up now and start managing your social media with AI."**
2. "Your early access is ready - no credit card required to get started."
3. "AI-powered comment management, automation, and analytics are now available."

To set this in SendGrid:
- Look for **"Preheader"** or **"Preview Text"** field when setting up campaign
- Enter your chosen preview text

---

## Template Variables

The templates use SendGrid's unsubscribe merge tag:

- `{{unsubscribe_url}}` - Automatically replaced with unsubscribe link

You can add more personalization:
- `{{first_name}}` - Add to greeting if you have names in your list
- `{{email}}` - User's email address

Example: Change "Hi there" to "Hi {{first_name}}" if you have first names.

---

## Best Practices

### Timing
- **Best days**: Tuesday, Wednesday, Thursday
- **Best time**: 10 AM - 2 PM in your audience's timezone
- Avoid Mondays (busy) and Fridays (weekend mode)

### Testing Checklist
- ✅ Preview on desktop and mobile
- ✅ Test all links (especially signup button)
- ✅ Check spelling and grammar
- ✅ Send test to multiple email clients (Gmail, Outlook, Apple Mail)
- ✅ Verify sender name and reply-to address
- ✅ Confirm unsubscribe link works

### Deliverability Tips
- Warm up your sending IP if this is your first large campaign
- Keep your list clean (remove bounces and complaints)
- Ensure your domain is verified in SendGrid
- Set up SPF, DKIM, and DMARC records for your domain

---

## Email Client Testing

The HTML templates are designed to work across:
- ✅ Gmail (web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (2016+, Office 365, web)
- ✅ Yahoo Mail
- ✅ Proton Mail
- ⚠️ Older Outlook versions (2007-2013) - use simple version

**If you have Litmus or Email on Acid**, test the template there first.

---

## Customization

### Change Colors

Main brand color (green): `#10b981`
To change, find and replace with your color:
- Header gradient: `#10b981` and `#059669`
- Button: `#10b981`
- Accents: `#d1fae5` (light green background)

### Change Links

Update these URLs in the template:
- Signup CTA: `https://repruv.co.uk/signup`
- Website: `https://repruv.co.uk`
- Twitter: `https://twitter.com/repruv`
- Privacy: `https://repruv.co.uk/privacy`

### Add Your Logo

Replace the text "Repruv" in the header with an image:

```html
<img src="https://yourdomain.com/logo.png" 
     alt="Repruv" 
     width="200" 
     style="max-width: 200px; height: auto;" />
```

---

## Tracking & Analytics

### SendGrid Tracking

Enable these in SendGrid settings:
- **Click Tracking** - See who clicks your signup link
- **Open Tracking** - See who opens the email
- **Subscription Tracking** - Track unsubscribes

### Google Analytics UTM Parameters

Add UTM parameters to track campaign performance:

Change signup link from:
```
https://repruv.co.uk/signup
```

To:
```
https://repruv.co.uk/signup?utm_source=sendgrid&utm_medium=email&utm_campaign=early_access_launch
```

Track in Google Analytics:
- **Acquisition** → **Campaigns** → See "early_access_launch" performance

---

## After Sending

### Monitor These Metrics

**First 24 hours:**
- Open rate (aim for 20%+)
- Click rate (aim for 2-5%)
- Bounce rate (should be <2%)
- Unsubscribe rate (should be <0.5%)

**First week:**
- Signups from campaign
- Conversion rate (opens → signups)
- User activation (signups → active users)

### Follow-up Strategy

**If user doesn't sign up within 3 days:**
- Send reminder email: "Still interested? Your access is waiting"

**If user signs up:**
- Send onboarding sequence (separate campaigns)
- Welcome email (immediate)
- Getting started tips (day 2)
- Feature highlights (day 5)

---

## Troubleshooting

### Links Don't Work
- Check that URLs don't have extra spaces
- Ensure `https://` is included
- Test in incognito/private browsing

### Images Don't Load
- Use absolute URLs (full `https://` path)
- Host images on reliable CDN
- Add `alt` text for accessibility

### Formatting Breaks in Outlook
- Use the simple template version
- Avoid complex CSS
- Test in Outlook before sending

### High Spam Rate
- Avoid spam trigger words ("Free", "Act Now", too many !!!)
- Don't use all caps in subject line
- Ensure unsubscribe link is visible
- Check sender reputation

---

## Support

**SendGrid Help:**
- Documentation: https://docs.sendgrid.com/
- Support: https://support.sendgrid.com/

**Email Testing Tools:**
- Litmus: https://litmus.com/
- Email on Acid: https://www.emailonacid.com/
- Mail Tester: https://www.mail-tester.com/

---

## Next Steps

1. ✅ Choose your template (full or simple)
2. ✅ Customize colors and links if needed
3. ✅ Set up campaign in SendGrid
4. ✅ Send test emails
5. ✅ Schedule or send to your waitlist
6. ✅ Monitor performance
7. ✅ Follow up with non-converters

**Good luck with your launch! 🚀**
