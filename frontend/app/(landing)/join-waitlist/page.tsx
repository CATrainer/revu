'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function JoinWaitlistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/users/waitlist/join', { email: formData.email });
      
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

  return (
    <div className="min-h-screen section-background py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="card-background shadow-xl overflow-visible">
          <CardHeader className="text-center px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col items-center w-full"
            >
                <CardTitle className="text-3xl md:text-4xl font-extrabold text-primary-dark leading-tight text-center mx-auto">
                  Get Early Access
                </CardTitle>
                <CardDescription className="text-sm font-medium text-secondary-dark mt-2 text-center w-full mx-auto px-4">
                  We’re in prelaunch. Share your email and we’ll notify you early when access opens.
                </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="px-8">
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <Label htmlFor="email" className="text-primary-dark font-medium">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className="mt-1 bg-[var(--card)] border-[var(--border)] text-primary-dark placeholder:text-secondary-dark focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 transition-all duration-200"
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Get Early Access'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
