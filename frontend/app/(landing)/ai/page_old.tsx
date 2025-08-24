"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LegacyAIPage() {
  return (
    <div className="max-w-3xl mx-auto py-24 px-4 section-background text-center">
      <h1 className="text-3xl font-bold text-primary-dark mb-3">This AI page has moved</h1>
      <p className="text-secondary-dark mb-8">
        We redesigned our AI experience. Please visit the new page for the latest content.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button className="button-primary" asChild>
          <Link href="/ai">Go to AI</Link>
        </Button>
        <Button variant="outline" className="border-[var(--border)]" asChild>
          <Link href="/features#ai-responses">See AI features</Link>
        </Button>
      </div>
    </div>
  );
}