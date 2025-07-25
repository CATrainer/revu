// frontend/components/landing/SocialProof.tsx
export function SocialProof() {
  const testimonials = [
    {
      content: "Revu has transformed how we manage our online reputation. We've saved over 15 hours per week and our response rate has increased by 300%.",
      author: "Sarah Johnson",
      role: "Marketing Director",
      company: "The Italian Place",
    },
    {
      content: "The AI responses are incredible - they sound exactly like us. Our customers can't tell the difference, and we respond 10x faster now.",
      author: "Michael Chen",
      role: "Owner",
      company: "Chen's Restaurant Group",
    },
    {
      content: "Being able to track our competitors and see what customers are saying about them has given us a huge strategic advantage.",
      author: "Emma Williams",
      role: "Operations Manager",
      company: "Boutique Hotels Ltd",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Businesses Like Yours
          </h2>
          <p className="text-lg text-gray-600">
            See what our customers have to say about Revu
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-8">
              <p className="text-gray-600 mb-6 italic">&ldquo;{testimonial.content}&rdquo;</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-600">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}