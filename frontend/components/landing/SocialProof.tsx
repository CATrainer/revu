// frontend/components/landing/SocialProof.tsx
export function SocialProof() {
  return (
    <section className="py-24 section-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-8">
            Our Vision
          </h2>
          <div className="text-lg text-secondary-dark leading-relaxed space-y-6">
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
            <p className="text-xl font-medium text-primary-dark">
              &ldquo;Technology should amplify your humanity, not replace it.&rdquo;
            </p>
            <p className="text-sm text-muted-dark italic">
              — The Repruv Team
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}