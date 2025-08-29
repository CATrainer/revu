'use client';

import { useState } from 'react';
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
    full_name: '',
    phone: '',
    company_name: '',
    industry: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Get Early Access</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Be the first to know when Repruv launches and get early access to powerful review management tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-gray-700 dark:text-gray-200 font-medium">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[var(--brand-primary-solid)] dark:focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 dark:focus:ring-[var(--brand-primary-solid)]/30"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 font-medium">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[var(--brand-primary-solid)] dark:focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 dark:focus:ring-[var(--brand-primary-solid)]/30"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-200 font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[var(--brand-primary-solid)] dark:focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 dark:focus:ring-[var(--brand-primary-solid)]/30"
                />
              </div>

              <div>
                <Label htmlFor="company_name" className="text-gray-700 dark:text-gray-200 font-medium">Company Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[var(--brand-primary-solid)] dark:focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 dark:focus:ring-[var(--brand-primary-solid)]/30"
                />
              </div>

              <div>
                <Label htmlFor="industry" className="text-gray-700 dark:text-gray-200 font-medium">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  type="text"
                  value={formData.industry}
                  onChange={handleInputChange}
                  placeholder="Restaurant, Retail, Healthcare, etc."
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[var(--brand-primary-solid)] dark:focus:border-[var(--brand-primary-solid)] focus:ring-[var(--brand-primary-solid)]/20 dark:focus:ring-[var(--brand-primary-solid)]/30"
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-[var(--brand-primary-solid)] to-[var(--brand-secondary-solid)] hover:from-[var(--brand-primary-solid-hover)] hover:to-[var(--brand-secondary-solid-hover)] text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 border-0 focus:ring-4 focus:ring-[var(--brand-primary-solid)]/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Early Access...
                  </>
                ) : (
                  'Get Early Access'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
