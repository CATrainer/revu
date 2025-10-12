// frontend/lib/privacy-content.ts

export const privacyPolicyContent = `Privacy Policy for Repruv

Last Updated: October 12, 2025

1. Introduction

Repruv ("we," "our," or "us") operates a social media management platform for content creators, influencers, and brands. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our platform at repruv.co.uk (the "Service").

By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, do not use our Service.

2. Information We Collect

We collect several types of information to provide and improve our Service:

2.1 Account Information
• Full name and email address (required for registration)
• Phone number (optional)
• Company/organization name (optional)
• Industry or business type (optional)
• Profile information and preferences
• Password (stored securely using industry-standard hashing)
• Authentication identifiers from Supabase Auth

2.2 YouTube Data (via YouTube API Services)
When you connect your YouTube account, we collect and store:
• YouTube channel ID and channel name
• Video metadata: titles, descriptions, thumbnails, publication dates, durations, tags
• Video performance metrics: view counts, like counts, comment counts
• Comment data: comment text, author names, author channel IDs, publication dates, like counts, reply counts
• OAuth access and refresh tokens (encrypted and stored securely)

IMPORTANT: We request the following YouTube API scopes:
• youtube.force-ssl: Allows us to read your channel data, videos, and comments, and post replies on your behalf
• We do NOT request permission to upload, delete, or modify your videos

You can revoke Repruv's access to your YouTube data at any time via your Google Account settings: https://myaccount.google.com/permissions

2.3 Social Media Content Data
For connected platforms, we collect:
• Content metadata (titles, descriptions, captions, hashtags, mentions)
• Performance metrics (views, likes, comments, shares, engagement rates)
• Publishing information (timestamps, timezones)
• Audience interactions (comments, direct messages, mentions)
• Platform-specific identifiers

2.4 AI-Generated Data
We create and store:
• AI-generated insights about your content performance
• AI conversation history from our AI Assistant feature
• Automated content classifications and sentiment analysis
• Response templates and AI-suggested replies
• Vector embeddings of your content for semantic search (generated using OpenAI)

2.5 Analytics and Usage Data
• Interaction patterns with comments and content
• Feature usage statistics
• Response rates and response times
• Workflow automation triggers and actions
• Performance benchmarks and trends

2.6 Technical Data
• IP address (for security and fraud prevention)
• Browser type and version
• Device information
• Session information
• API request logs
• Error logs and debugging information

2.7 Audit Information
For security and compliance:
• User actions and changes to data
• Login timestamps
• User agent strings

3. How We Use Your Information

We use the collected information for the following purposes:

3.1 Service Delivery
• Provide access to the Repruv platform and its features
• Sync and display your YouTube videos and comments
• Enable AI-powered comment management and response generation
• Provide content performance analytics and insights
• Execute automation workflows you configure
• Generate AI recommendations for content strategy

3.2 AI Processing
• Analyze your content using OpenAI GPT-4 and Anthropic Claude
• Generate embeddings for semantic content search
• Provide personalized AI assistance through our chatbot
• Create automated response suggestions
• Detect sentiment, categories, and priority levels in interactions

3.3 Platform Improvement
• Improve our algorithms and AI models
• Develop new features and functionality
• Debug and resolve technical issues
• Conduct analytics to understand platform usage

3.4 Communications
• Send service-related notifications and updates
• Respond to your support requests
• Send marketing communications (with your consent)
• Notify you of changes to our Service or policies

3.5 Security and Compliance
• Detect and prevent fraud, abuse, or security incidents
• Comply with legal obligations
• Enforce our Terms of Service
• Maintain audit logs for accountability

4. How We Share Your Information

We do NOT sell your personal information. We share your information only in the following circumstances:

4.1 Service Providers
We share data with third-party service providers who help us operate the Service:

• Supabase: Database hosting and authentication (PostgreSQL with pgvector)
• Railway.app: Backend infrastructure and API hosting
• Vercel: Frontend hosting
• Redis Labs/Upstash: Caching and background job processing
• OpenAI: AI text generation and embeddings (GPT-4, text-embedding-3-small)
• Anthropic: AI chat assistance (Claude 3.5 Sonnet)
• Resend: Transactional email delivery
• SendGrid: Marketing emails (optional, with your consent)
• Cloudflare R2: File storage
• Google (YouTube API Services): To access your YouTube data per your authorization

All service providers are contractually obligated to protect your data and use it only for specified purposes.

4.2 YouTube API Services
Repruv's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Learn more at: https://developers.google.com/terms/api-services-user-data-policy

We only use YouTube data to:
• Display your videos and comments within the Repruv platform
• Provide analytics on your YouTube performance
• Enable you to respond to comments
• Generate AI insights about your content

We do NOT:
• Transfer YouTube data to third parties (except as required for Service delivery)
• Use YouTube data for advertising or marketing unrelated to Repruv features
• Allow humans to read your YouTube data except for security, compliance, or with your explicit consent

4.3 Legal Requirements
We may disclose your information if required by law, court order, or governmental authority, or to:
• Protect our rights, property, or safety
• Protect the rights, property, or safety of our users or the public
• Detect, prevent, or address fraud or security issues

4.4 Business Transfers
If Repruv is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information becomes subject to a different privacy policy.

5. Data Retention

• Account Data: Retained while your account is active and for up to 90 days after deletion
• YouTube Data: Retained while your YouTube connection is active and for up to 30 days after disconnection
• AI Chat History: Retained indefinitely unless you delete it or request deletion
• Audit Logs: Retained for 2 years for security and compliance purposes
• Analytics Data: Aggregated and anonymized data may be retained indefinitely

You can request deletion of your data at any time by contacting us at info@repruv.co.uk.

6. Your Rights

Depending on your location, you may have the following rights:

6.1 Access and Portability
• Request a copy of your personal data in a structured, machine-readable format
• Export your content and analytics data

6.2 Correction
• Update or correct inaccurate personal information through your account settings
• Request correction of data you cannot modify directly

6.3 Deletion
• Delete your account and associated data
• Request removal of specific data
• Revoke YouTube API access (via Google Account settings)

6.4 Opt-Out
• Unsubscribe from marketing emails (link provided in each email)
• Disable specific features or data collection

6.5 Object and Restrict
• Object to certain data processing activities
• Request restricted processing under certain circumstances

To exercise these rights, contact us at info@repruv.co.uk or through your account settings.

7. Data Security

We implement industry-standard security measures:
• Encryption in transit (HTTPS/TLS) and at rest for sensitive data
• OAuth tokens encrypted using AES-256 encryption
• Password hashing using bcrypt
• Role-based access controls
• Regular security audits and monitoring
• Secure API authentication via JWT tokens
• Rate limiting to prevent abuse

However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.

8. Cookies and Tracking

We use cookies and similar technologies for:
• Authentication and session management
• Preference storage
• Analytics and performance monitoring
• Feature functionality

You can control cookies through your browser settings. Disabling cookies may limit Service functionality.

9. Third-Party Links

Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.

10. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence, including the United States and European Union. We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.

11. Children's Privacy

Our Service is not intended for individuals under 13 years of age (or 16 in the EU). We do not knowingly collect personal information from children. If you believe we have collected data from a child, contact us immediately at info@repruv.co.uk.

12. California Privacy Rights (CCPA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act:
• Right to know what personal information we collect, use, and share
• Right to delete personal information
• Right to opt-out of the sale of personal information (we do not sell personal information)
• Right to non-discrimination for exercising your rights

To exercise these rights, email info@repruv.co.uk with "CCPA Request" in the subject line.

13. European Privacy Rights (GDPR)

If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation:
• Legal basis for processing: Consent, contract performance, legitimate interests, legal obligations
• Right to withdraw consent at any time
• Right to lodge a complaint with your local supervisory authority

Our EU representative can be contacted at info@repruv.co.uk.

14. Changes to This Privacy Policy

We may update this Privacy Policy periodically. We will notify you of significant changes by:
• Posting the updated policy on our website with a new "Last Updated" date
• Sending an email notification to your registered email address
• Displaying a prominent notice on the platform

Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.

15. Contact Us

For questions, concerns, or requests regarding this Privacy Policy or your personal data:

Email: info@repruv.co.uk
Website: https://repruv.co.uk

For YouTube data-specific inquiries or to revoke access:
Google Account Permissions: https://myaccount.google.com/permissions

16. Google OAuth Disclosure

Repruv uses Google OAuth 2.0 to access your YouTube data. By connecting your YouTube account:
• You grant Repruv permission to access your YouTube channel data per the scopes you approve
• You can revoke this permission at any time via your Google Account
• Repruv will not access your YouTube data beyond what you explicitly authorize
• We comply with Google's API Services User Data Policy and Limited Use requirements

For more information about how Google handles your data, visit: https://policies.google.com/privacy`;
