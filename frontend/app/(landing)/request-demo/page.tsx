'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Calendar, Users2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RequestDemoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    company_name: '',
    team_size: '',
    needs: '',
    preferred_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real implementation, this would send to a demo-specific endpoint
      await api.post('/users/waitlist/join', {
        ...formData,
        request_type: 'demo'
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/thank-you-demo');
      }, 2000);
    } catch (err: unknown) {
      type AxiosLike = { response?: { data?: { message?: string } } };
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const r = (err as AxiosLike).response;
        setError(r?.data?.message || 'Something went wrong. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message || 'Something went wrong. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 bg-gradient-to-b from-white to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container px-4 md:px-6">
        <motion.div 
          className="grid gap-6 lg:grid-cols-2 lg:gap-12 max-w-6xl mx-auto items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left Column - Explanation */}
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-600 dark:text-green-500 tracking-tight">
              Book Your Personalized Demo
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md">
              See how Repruv can transform your community engagement and help you build stronger connections with your audience.
            </p>
            
            <div className="grid gap-4 mt-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personalized Walkthrough</h3>
                  <p className="text-gray-600 dark:text-gray-400">Our team will customize the demo to your specific needs and use cases</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <Users2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expert Guidance</h3>
                  <p className="text-gray-600 dark:text-gray-400">Speak with our product specialists who understand your industry challenges</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Form */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-950/90 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-extrabold text-green-500 dark:text-green-400 leading-tight">Request Demo</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
                Fill out the form below and our team will get back to you within 24 hours to schedule your demo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">Thank you for your request!</h3>
                  <p className="text-green-600 dark:text-green-300">We&apos;ll be in touch soon to schedule your demo.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      placeholder="John Smith"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@company.com"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="company_name">Company/Brand Name</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="Your Company or Brand"
                      required
                      value={formData.company_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="team_size">Team Size</Label>
                    <Select 
                      value={formData.team_size} 
                      onValueChange={(value) => handleSelectChange('team_size', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Just me</SelectItem>
                        <SelectItem value="2-5">2-5 people</SelectItem>
                        <SelectItem value="6-10">6-10 people</SelectItem>
                        <SelectItem value="11-25">11-25 people</SelectItem>
                        <SelectItem value="26+">26+ people</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="needs">What are you looking to achieve with Repruv?</Label>
                    <Textarea
                      id="needs"
                      name="needs"
                      placeholder="Tell us about your needs and challenges..."
                      rows={3}
                      value={formData.needs}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Request Demo'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
