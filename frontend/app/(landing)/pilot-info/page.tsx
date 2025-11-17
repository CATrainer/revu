'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import {
  Shield, Lock, Database, Key, Link as LinkIcon,
  CheckCircle2, AlertCircle, Youtube, Instagram,
  Server, HardDrive, CloudCog, Users, Mail,
  FileText, Trash2, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';

// Helper component for section animations
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

// Helper component for info boxes
function InfoBox({
  icon: Icon,
  title,
  children,
  variant = 'default'
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
}) {
  const containerStyles = {
    default: 'card-background border border-[var(--border)]',
    warning: 'border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/10',
    success: 'border border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/10'
  };

  const iconWrapperStyles = {
    default: 'bg-[var(--muted)] text-[var(--brand-primary)]',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
  };

  return (
    <div className={cn('rounded-2xl p-6', containerStyles[variant])}>
      <div className="flex items-start gap-4">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', iconWrapperStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-primary-dark mb-3">{title}</h3>
          <div className="text-secondary-dark space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PilotInfoPage() {
  return (
    <div className="min-h-screen section-background py-16">
      {/* Hero */}
      <Section>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <div className="inline-block px-4 py-2 bg-holo-mint/10 rounded-full mb-6">
            <span className="text-holo-mint font-bold text-sm">PILOT PROGRAM</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--brand-primary)] mb-6">
            Repruv Pilot Information
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
            Welcome to the Repruv pilot program! This guide explains how our platform integrations work,
            what data we collect, how we keep it secure, and step-by-step instructions for connecting your accounts.
          </p>
        </section>
      </Section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

        {/* Platform Connections Overview */}
        <Section delay={0.1}>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-[var(--brand-primary)] flex items-center gap-3">
              <LinkIcon className="w-8 h-8 text-holo-mint" />
              Platform Connections Overview
            </h2>

            {/* YouTube */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Youtube className="w-8 h-8 text-red-500" />
                <h3 className="text-2xl font-bold text-[var(--brand-primary)]">YouTube Integration</h3>
              </div>

              <InfoBox icon={Key} title="How It Works">
                <p>
                  We use Google OAuth 2.0 to securely connect your YouTube channel. When you connect,
                  you&apos;ll be redirected to Google&apos;s official login page where you authorize Repruv to access
                  specific parts of your YouTube account.
                </p>
              </InfoBox>

              <InfoBox icon={CheckCircle2} title="Permissions We Request">
                <p className="font-semibold mb-2">We request one of the following OAuth scopes:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span>
                      <strong>youtube.force-ssl</strong> - Full read/write access to your YouTube channel
                      (allows us to reply to comments, manage interactions)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span>
                      <strong>youtube.readonly</strong> - Read-only access (if you only want analytics and insights)
                    </span>
                  </li>
                </ul>
              </InfoBox>

              <InfoBox icon={Database} title="Data We Access">
                <p className="font-semibold mb-2">From the YouTube Data API v3, we fetch:</p>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Channel info:</strong> name, subscriber count, total views, video count</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Video metadata:</strong> titles, descriptions, thumbnails, publish dates, durations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Video statistics:</strong> views, likes, comments count, watch time, engagement rates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Comments:</strong> comment text, author info, timestamps, reply threads, like counts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Performance data:</strong> impressions, click-through rates, traffic sources, audience demographics</span>
                  </li>
                </ul>
              </InfoBox>
            </div>

            {/* Instagram */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 mb-4">
                <Instagram className="w-8 h-8 text-pink-500" />
                <h3 className="text-2xl font-bold text-[var(--brand-primary)]">Instagram Integration</h3>
              </div>

              <InfoBox icon={AlertCircle} title="Account Requirements" variant="warning">
                <p>
                  <strong>Important:</strong> To use Repruv with Instagram, you need either a <strong>Business</strong> or
                  <strong> Creator</strong> account. Personal Instagram accounts have limited API access and won&apos;t
                  provide the full functionality (comments management, insights, etc.).
                </p>
                <p className="mt-2">
                  Additionally, your Instagram Business/Creator account must be linked to a Facebook Page to enable
                  the Instagram Graph API permissions we need.
                </p>
              </InfoBox>

              <InfoBox icon={Key} title="How It Works">
                <p>
                  We use Meta&apos;s OAuth 2.0 system to connect your Instagram account. This is the same secure
                  authentication system used by Facebook and Instagram. You&apos;ll authorize Repruv through Meta&apos;s
                  official login flow.
                </p>
              </InfoBox>

              <InfoBox icon={CheckCircle2} title="Permissions We Request">
                <p className="font-semibold mb-2">We request the following Instagram Graph API scopes:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>instagram_basic</strong> - Access to basic profile info and media</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>instagram_manage_comments</strong> - Read and respond to comments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>instagram_manage_insights</strong> - Access analytics and performance data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>pages_show_list</strong> - List Facebook Pages linked to your Instagram account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>pages_read_engagement</strong> - Read engagement data from connected Pages</span>
                  </li>
                </ul>
              </InfoBox>

              <InfoBox icon={Database} title="Data We Access">
                <p className="font-semibold mb-2">From the Instagram Graph API, we fetch:</p>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Profile info:</strong> username, account type, bio, profile picture, follower/following counts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Media posts:</strong> photos, videos, reels, carousels with captions, timestamps, hashtags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Stories:</strong> story content and expiration times (24-hour visibility window)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Engagement metrics:</strong> likes, comments, saves, shares, play counts (for videos)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Comments:</strong> comment text, author info, timestamps, reply threads, like counts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-holo-mint mt-1">•</span>
                    <span><strong>Insights:</strong> reach, impressions, profile views, website clicks, audience demographics</span>
                  </li>
                </ul>
              </InfoBox>
            </div>
          </div>
        </Section>

        {/* Data Collection & Storage */}
        <Section delay={0.2}>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-[var(--brand-primary)] flex items-center gap-3">
              <Database className="w-8 h-8 text-holo-mint" />
              Data Collection &amp; Storage
            </h2>

            <InfoBox icon={HardDrive} title="What We Store in Our Database">
              <p className="font-semibold mb-3">Our Supabase PostgreSQL database stores:</p>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">1. Platform Connection Data</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>YouTube: channel ID, channel name, connection status, last sync timestamp</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Instagram: user ID, username, account type, follower counts, connection status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span><strong>Access tokens</strong> (encrypted - see Security section below)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">2. Content Data</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Video/post metadata (titles, descriptions, URLs, thumbnails, publish dates)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Performance metrics (views, likes, comments, shares, engagement rates)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Content categorization and tags for analysis</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">3. Comments &amp; Interactions</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Comment text, author names, author IDs, timestamps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Reply threads and parent-child comment relationships</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>AI-generated sentiment analysis, priority scores, detected keywords</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Workflow status (read/unread, assigned, tags, internal notes)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">4. Analytics &amp; Insights</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Audience demographics (age, gender, location - aggregated data from platforms)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Traffic sources, device types, watch time patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Engagement trends, growth metrics, content performance rankings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>AI-generated insights and opportunity recommendations</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">5. Your Account Data</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Email address, hashed password (via Supabase Auth), account settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>Usage credits, billing information, subscription tier</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-holo-mint mt-1">•</span>
                      <span>AI chat conversations and preferences</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 text-sm">
                <strong>Note:</strong> We only store data necessary for providing our service. We never sell
                your data to third parties or use it for purposes beyond operating and improving Repruv.
              </p>
            </InfoBox>

            <InfoBox icon={FileText} title="Data Retention">
              <p>
                We retain your connected platform data for as long as your account is active and the connection
                is maintained. Historical performance data is kept to provide trend analysis and insights.
              </p>
              <p className="mt-2">
                When you disconnect a platform or delete your account, we remove the associated data according
                to our data retention policy.
              </p>
            </InfoBox>
          </div>
        </Section>

        {/* Data Security */}
        <Section delay={0.3}>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-[var(--brand-primary)] flex items-center gap-3">
              <Shield className="w-8 h-8 text-holo-mint" />
              Data Security
            </h2>

            <InfoBox icon={Lock} title="Token Encryption" variant="success">
              <p>
                <strong>All OAuth access tokens and refresh tokens are encrypted at rest</strong> using
                Fernet encryption (AES-128-CBC with HMAC authentication).
              </p>
              <p className="mt-2">
                This means that even if someone gained unauthorized database access, they couldn&apos;t read your
                access tokens without the encryption key (which is stored separately and securely in our
                environment configuration).
              </p>
              <p className="mt-2 text-sm">
                <strong>Technical details:</strong> We use the <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">cryptography.fernet</code> Python
                library, which provides authenticated encryption with timestamp validation to prevent replay attacks.
              </p>
            </InfoBox>

            <InfoBox icon={Server} title="Infrastructure Security">
              <p className="font-semibold mb-2">Our secure infrastructure stack:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>Frontend:</strong> Hosted on Vercel with automatic HTTPS, DDoS protection, and edge caching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>Backend API:</strong> Hosted on Railway with isolated containers, automatic deployments, and environment isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>Database:</strong> Supabase (managed PostgreSQL) with row-level security, automatic backups, and encryption at rest</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>All connections:</strong> TLS/HTTPS encrypted in transit</span>
                </li>
              </ul>
            </InfoBox>

            <InfoBox icon={Key} title="Token Refresh &amp; Expiration">
              <p>
                Access tokens have limited lifespans and are automatically refreshed when needed:
              </p>
              <ul className="space-y-1 ml-4 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>YouTube:</strong> Access tokens expire after ~1 hour; we use refresh tokens to obtain new ones automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-holo-mint mt-1">•</span>
                  <span><strong>Instagram:</strong> Short-lived tokens (1 hour) are exchanged for long-lived tokens (60 days) which we refresh before expiration</span>
                </li>
              </ul>
              <p className="mt-2">
                This time-limited approach minimizes security risk by ensuring tokens can&apos;t be used indefinitely
                if compromised.
              </p>
            </InfoBox>

            <InfoBox icon={Trash2} title="Revoking Access">
              <p className="font-semibold mb-2">You can revoke Repruv&apos;s access at any time:</p>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">From Repruv Dashboard:</p>
                  <p className="ml-4 mt-1">
                    Go to Settings → Platform Connections and click &quot;Disconnect&quot; on any connected account.
                    This immediately removes the connection and deletes stored tokens.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">From Google (YouTube):</p>
                  <p className="ml-4 mt-1">
                    Visit{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-holo-mint hover:underline inline-flex items-center gap-1"
                    >
                      Google Account Permissions
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    , find Repruv, and click &quot;Remove Access&quot;.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[var(--brand-primary)]">From Meta (Instagram/Facebook):</p>
                  <p className="ml-4 mt-1">
                    Go to Facebook Settings → Apps and Websites (or{' '}
                    <a
                      href="https://www.facebook.com/settings?tab=applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-holo-mint hover:underline inline-flex items-center gap-1"
                    >
                      direct link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    ), find Repruv, and remove it.
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm">
                When you revoke access, we can no longer fetch new data from your account. Existing data in our
                system is retained according to our data retention policy unless you explicitly request deletion.
              </p>
            </InfoBox>

            <InfoBox icon={Users} title="Team Access &amp; Audit Logs">
              <p>
                Only Repruv team members with explicit permissions can access backend systems. All administrative
                actions are logged with timestamps, user IDs, IP addresses, and session tracking for security auditing.
              </p>
            </InfoBox>
          </div>
        </Section>

        {/* Setup Instructions */}
        <Section delay={0.4}>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-[var(--brand-primary)] flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-holo-mint" />
              Step-by-Step Setup Instructions
            </h2>

            {/* YouTube Setup */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Youtube className="w-8 h-8 text-red-500" />
                <h3 className="text-2xl font-bold text-[var(--brand-primary)]">Connecting YouTube</h3>
              </div>

              <div className="glass-panel rounded-xl p-6">
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      1
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Log into Repruv</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Sign in to your Repruv account and navigate to your Dashboard.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      2
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Go to Platform Connections</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Click on Settings or Socials in the sidebar, then find the YouTube connection card.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      3
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Click &quot;Connect YouTube&quot;</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        You&apos;ll be redirected to Google&apos;s official OAuth consent screen. This is a secure Google page
                        (check the URL is accounts.google.com).
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      4
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Select Your Google Account</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Choose the Google account associated with your YouTube channel. If you&apos;re already signed in,
                        Google may skip this step.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      5
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Review Permissions</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Google will show you exactly what permissions Repruv is requesting (e.g., &quot;Manage your YouTube account&quot;).
                        Review these carefully.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      6
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Click &quot;Allow&quot;</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        If you agree with the permissions, click &quot;Allow&quot; to authorize the connection.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      7
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Return to Repruv</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        You&apos;ll be automatically redirected back to your Repruv dashboard. You should see a success
                        message and your YouTube channel will appear as connected.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-holo-mint/20 text-holo-mint font-bold flex items-center justify-center">
                      8
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Initial Sync Begins</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Repruv will automatically start syncing your YouTube channel data (videos, comments, analytics).
                        This can take a few minutes depending on the size of your channel. You can navigate away and
                        come back later - the sync continues in the background.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Instagram Setup */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 mb-4">
                <Instagram className="w-8 h-8 text-pink-500" />
                <h3 className="text-2xl font-bold text-[var(--brand-primary)]">Connecting Instagram</h3>
              </div>

              <InfoBox icon={AlertCircle} title="Before You Start" variant="warning">
                <p className="font-semibold mb-2">Prerequisites:</p>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>Your Instagram account must be a <strong>Business</strong> or <strong>Creator</strong> account (not Personal)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>It must be linked to a Facebook Page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>You need admin access to both the Instagram account and the linked Facebook Page</span>
                  </li>
                </ul>
                <p className="mt-3 text-sm">
                  If you haven&apos;t done this yet, follow the instructions below to convert your account first.
                </p>
              </InfoBox>

              <div className="glass-panel rounded-xl p-6">
                <h4 className="font-bold text-[var(--brand-primary)] mb-3">Converting to Business/Creator Account</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-[var(--brand-primary)]">Open Instagram App</p>
                      <p className="text-secondary-dark mt-1">
                        Open the Instagram mobile app and go to your profile.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-[var(--brand-primary)]">Go to Settings</p>
                      <p className="text-secondary-dark mt-1">
                        Tap the menu icon (three horizontal lines) → Settings and privacy → Account type and tools.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-[var(--brand-primary)]">Switch to Professional Account</p>
                      <p className="text-secondary-dark mt-1">
                        Tap &quot;Switch to professional account&quot; and choose either Business or Creator.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-xs">
                      4
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-[var(--brand-primary)]">Create or Link Facebook Page</p>
                      <p className="text-secondary-dark mt-1">
                        During setup, Instagram will ask you to create a new Facebook Page or link an existing one.
                        If you don&apos;t have a Facebook Page, follow the prompts to create one (it&apos;s quick and free).
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-xs">
                      5
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-semibold text-[var(--brand-primary)]">Complete Setup</p>
                      <p className="text-secondary-dark mt-1">
                        Follow the remaining steps (select category, add contact info, etc.). Once done, your account
                        is ready to connect to Repruv!
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="glass-panel rounded-xl p-6 mt-6">
                <h4 className="font-bold text-[var(--brand-primary)] mb-3">Connecting Instagram to Repruv</h4>
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      1
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Log into Repruv</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Sign in to your Repruv account and navigate to your Dashboard.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      2
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Go to Platform Connections</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Click on Settings or Socials in the sidebar, then find the Instagram connection card.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      3
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Click &quot;Connect Instagram&quot;</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        You&apos;ll be redirected to Meta/Facebook&apos;s OAuth consent screen. This is a secure Facebook page
                        (check the URL is facebook.com).
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      4
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Log in to Facebook</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Enter your Facebook credentials (the account connected to your Instagram Business/Creator account).
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      5
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Select Your Facebook Page</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Meta will ask you to choose which Facebook Page (and linked Instagram account) to grant access to.
                        Select the Page linked to your Instagram account.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      6
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Review Permissions</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Meta will display the permissions Repruv is requesting (e.g., &quot;Access Instagram comments&quot;,
                        &quot;View Instagram insights&quot;). Review these carefully.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      7
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Click &quot;Continue&quot; or &quot;Allow&quot;</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        If you agree with the permissions, authorize the connection.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      8
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Return to Repruv</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        You&apos;ll be redirected back to your Repruv dashboard. You should see a success message and your
                        Instagram account will appear as connected.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center">
                      9
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-[var(--brand-primary)]">Initial Sync Begins</p>
                      <p className="text-secondary-dark text-sm mt-1">
                        Repruv will start syncing your Instagram data (posts, reels, stories, comments, insights).
                        This may take several minutes. The sync runs in the background, so you can continue using Repruv.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </Section>

        {/* Contact & Support */}
        <Section delay={0.5}>
          <div className="glass-panel rounded-xl p-8 text-center">
            <Mail className="w-12 h-12 text-holo-mint mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-3">
              Questions or Need Help?
            </h3>
            <p className="text-secondary-dark mb-6 max-w-2xl mx-auto">
              We&apos;re here to help! If you have questions about connecting your accounts, data privacy,
              security, or anything else, please don&apos;t hesitate to reach out.
            </p>
            <Button asChild size="lg" className="bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-white">
              <a href="mailto:support@repruv.co.uk">
                Email support@repruv.co.uk
              </a>
            </Button>
          </div>
        </Section>

        {/* Ready to Join */}
        <Section delay={0.6}>
          <div className="glass-panel rounded-xl p-8 text-center bg-gradient-to-br from-holo-mint/10 to-holo-teal/10 border-2 border-holo-mint/30">
            <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-3">
              Ready to Join the Pilot?
            </h3>
            <p className="text-secondary-dark mb-6 max-w-2xl mx-auto">
              Create your Repruv account and start connecting your platforms today.
              During the pilot program, you&apos;ll get free unlimited access to all features!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-white">
                <Link href="/signup">
                  Join Early Access - Free
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">
                  Learn More About Repruv
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
