// frontend/components/landing/SocialProof.tsx
export function SocialProof() {
  return (
    <section className="py-24 bg-white dark:bg-[hsl(222,84%,5%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[hsl(215,20%,85%)] mb-8">
            Our Vision
          </h2>
          <div className="text-lg text-gray-600 dark:text-[hsl(215,20%,65%)] leading-relaxed space-y-6">
            <p>
              We believe that every business deserves to have meaningful conversations with their customers. 
              In a world where online reviews and feedback shape customer decisions, maintaining authentic 
              engagement shouldn&apos;t be a burden that consumes hours of your valuable time.
            </p>
            <p>
              Our mission is to empower businesses of all sizes to maintain their unique voice and 
              personality while leveraging the power of AI to respond faster, more consistently, and 
              more thoughtfully than ever before.
            </p>
            <p className="text-xl font-medium text-gray-900 dark:text-[hsl(215,20%,85%)]">
              &ldquo;Technology should amplify your humanity, not replace it.&rdquo;
            </p>
            <p className="text-sm text-gray-500 dark:text-[hsl(215,20%,55%)] italic">
              — The Revu Team
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}