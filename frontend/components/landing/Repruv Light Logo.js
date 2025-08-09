// Example: OurVision.tsx

import Image from 'next/image';

export default function OurVision() {
  return (
    <section className="flex items-center gap-8 py-12">
      <div className="flex-shrink-0">
        <Image
          src="/vision.png"
          alt="Our Vision"
          width={120}
          height={120}
          className="rounded-lg"
        />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
        <p>
          {/* ...your vision paragraph text here... */}
          At Repruve, our vision is to empower businesses with intelligent tools for managing their online reputation, fostering trust, and driving growth in the digital age.
        </p>
      </div>
    </section>
  );
}