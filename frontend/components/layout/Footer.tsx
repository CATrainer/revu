// frontend/components/layout/Footer.tsx
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="section-background border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>

            <Link href="/" aria-label="Repruv home" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo/text_light.png"
                alt="Repruv"
                width={130}
                height={36}
                className="h-9 w-auto dark:hidden"
              />
              <Image
                src="/logo/text_dark.png"
                alt="Repruv"
                width={130}
                height={36}
                className="h-9 w-auto hidden dark:inline"
              />
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] max-w-xs">

              Your AI-Powered Creator Assistant.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Pricing</Link></li>
              <li><Link href="/join-waitlist" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Join Waitlist</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">About</Link></li>
              <li><Link href="/blog" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Blog</Link></li>
              <li><Link href="/contact" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Legal</h4>
            <ul className="space-y-2">

              <li><Link href="/privacy" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-primary-solid)] dark:hover:text-[var(--brand-primary)]">Terms of Service</Link></li>

            </ul>
          </div>
        </div>
        

        <div className="mt-8 pt-8 border-t border-[var(--border)]">
          <p className="text-center text-sm text-[var(--muted-foreground)]">

            © 2025 Repruv. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}