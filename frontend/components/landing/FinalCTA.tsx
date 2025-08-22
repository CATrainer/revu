// frontend/components/landing/FinalCTA.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function FinalCTA() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    company_name: '',
    industry: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/users/waitlist/join', formData);
      
      // Redirect to success page with user info
      router.push(`/waitlist-success?user_id=${response.data.user_id}&has_account=${response.data.has_account}&email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      console.error('Failed to get early access:', error);
      let errorMessage = 'Failed to get early access. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleFieldFocus = (fieldName: string) => {
    setFocusedField(fieldName);
    setIsExpanded(true);
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  return (
    <motion.section 
      id="early-access-form" 
      className="py-24 section-background-alt"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-3xl md:text-4xl font-bold brand-text mb-4 font-['Poppins',sans-serif]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Ready to Transform Your Online Reputation?
          </motion.h2>
          <motion.p 
            className="text-xl text-primary-dark max-w-3xl mx-auto font-['Poppins',sans-serif] font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Join hundreds of businesses saving time and enchancing their online reputation with Repruv
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {/* Left side - Early Access Form */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <motion.div
              animate={{ 
                scale: isExpanded ? 1.02 : 1,
                y: isExpanded ? -5 : 0
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
              onClick={handleFormClick}
              className="cursor-pointer"
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center pb-4">
                  <motion.div
                    animate={{ scale: focusedField ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardTitle className="text-2xl font-bold text-primary-dark font-['Poppins',sans-serif]">Get Early Access</CardTitle>
                    <CardDescription className="text-primary-dark mt-2 font-['Poppins',sans-serif] font-bold">
                      Be the first to know when Repruv launches and get early access to powerful reputation management tools.
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                <CardContent className="pt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Essential fields - always visible */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Label htmlFor="full_name" className="text-sm font-medium font-['Poppins',sans-serif]">Full Name *</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          type="text"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          onFocus={() => handleFieldFocus('full_name')}
                          onBlur={handleFieldBlur}
                          placeholder="John Doe"
                          className="mt-1 transition-all duration-200 focus:scale-105"
                        />
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Label htmlFor="email" className="text-sm font-medium font-['Poppins',sans-serif]">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          onFocus={() => handleFieldFocus('email')}
                          onBlur={handleFieldBlur}
                          placeholder="john@example.com"
                          className="mt-1 transition-all duration-200 focus:scale-105"
                        />
                      </motion.div>
                    </div>

                    {/* Optional fields - show with animation when expanded */}
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: isExpanded ? "auto" : 0,
                        opacity: isExpanded ? 1 : 0,
                        marginTop: isExpanded ? 16 : 0
                      }}
                      transition={{ 
                        duration: 0.4, 
                        ease: "easeInOut",
                        opacity: { delay: isExpanded ? 0.1 : 0 }
                      }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Label htmlFor="phone" className="text-sm font-medium font-['Poppins',sans-serif]">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleInputChange}
                              onFocus={() => handleFieldFocus('phone')}
                              onBlur={handleFieldBlur}
                              placeholder="+1 (555) 123-4567"
                              className="mt-1 transition-all duration-200 focus:scale-105"
                            />
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Label htmlFor="company_name" className="text-sm font-medium font-['Poppins',sans-serif]">Company Name</Label>
                            <Input
                              id="company_name"
                              name="company_name"
                              type="text"
                              value={formData.company_name}
                              onChange={handleInputChange}
                              onFocus={() => handleFieldFocus('company_name')}
                              onBlur={handleFieldBlur}
                              placeholder="Acme Inc."
                              className="mt-1 transition-all duration-200 focus:scale-105"
                            />
                          </motion.div>
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Label htmlFor="industry" className="text-sm font-medium font-['Poppins',sans-serif]">Industry</Label>
                          <Input
                            id="industry"
                            name="industry"
                            type="text"
                            value={formData.industry}
                            onChange={handleInputChange}
                            onFocus={() => handleFieldFocus('industry')}
                            onBlur={handleFieldBlur}
                            placeholder="Restaurant, Retail, Healthcare, etc."
                            className="mt-1 transition-all duration-200 focus:scale-105"
                          />
                        </motion.div>
                      </div>
                    </motion.div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2 text-red-600 text-sm"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="pt-2"
                    >
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full text-lg py-6 transition-all duration-200"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Getting Early Access...
                          </>
                        ) : (
                          'Get Early Access'
                        )}
                      </Button>
                    </motion.div>

                    {!isExpanded && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-sm text-secondary-dark mt-3 font-['Poppins',sans-serif]"
                      >
                        Click to add optional details
                      </motion.p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Right side - Demo Option */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2 flex items-start"
          >
            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full"
            >
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-fit">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-primary-dark font-['Poppins',sans-serif]">
                    Prefer a Demo?
                  </CardTitle>
                  <CardDescription className="text-primary-dark mt-2 font-['Poppins',sans-serif] font-bold">
                    Schedule a personalized demo to see how Repruv can enhcance your reputation management process.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 text-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="button-secondary w-full" asChild>
                      <Link href="/demo">Book a Demo</Link>
                    </Button>
                  </motion.div>
                  
                  <div className="mt-6 pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-secondary-dark font-['Poppins',sans-serif]">
                      🎯 Personalized walkthrough • See live features • Ask questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
