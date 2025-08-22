'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

export default function DemoBookedPage() {
  const router = useRouter();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    company_name: '',
    industry: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First add to early access
      await api.post('/users/waitlist/join', {
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        company_name: formData.company_name,
        industry: formData.industry
      });

      // Then create account
      const response = await api.post('/users/waitlist/create-account', {
        email: formData.email,
        password: formData.password
      });

      // Mark as demo requested
      await api.post('/users/request-demo', {});

      // Set user as authenticated and redirect to waiting area
      localStorage.setItem('user', JSON.stringify(response.data));
      router.push('/waiting-area');
      
    } catch (error: unknown) {
      console.error('Failed to create account:', error);
      let errorMessage = 'Failed to create account. Please try again.';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Demo Booked Successfully!</CardTitle>
            <CardDescription>
              Great! We&apos;ve scheduled your demo. Check your email for the meeting details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-primary-dark">
                  Demo scheduled - Check your email for details
                </span>
              </div>
            </div>

            {!showAccountForm ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-secondary-dark mb-4">
                    Want to get the most out of your demo? Create an account to unlock exclusive features and early access.
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setShowAccountForm(true)}
                      className="w-full"
                    >
                      Create Account Now
                    </Button>
                    <Button 
                      variant="outline" 
                      asChild
                      className="w-full"
                    >
                      <Link href="/">Return to Home</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_name">Company</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    type="text"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="Restaurant, Retail, Healthcare, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account & Get Early Access'
                    )}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowAccountForm(false)}
                    className="w-full"
                  >
                    Maybe Later
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
