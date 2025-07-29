'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    company_size: '',
    current_solution: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post('/users/request-demo', {
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company_name: formData.company,
        company_size: formData.company_size,
        current_solution: formData.current_solution,
        message: formData.message
      });

      // Save user info for Calendly prefill
      localStorage.setItem('demoUserInfo', JSON.stringify({
        name: formData.name,
        email: formData.email
      }));
      // Redirect to success page with Calendly
      router.push('/demo-scheduled');
    } catch (error) {
      console.error('Error submitting demo request:', error);
      alert('There was an error submitting your demo request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left Column - Info */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              See Revu in Action
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Get a personalized demo from our team and discover how Revu can transform your review management
            </p>

            <div className="space-y-6 mb-8">
              <div className="flex items-start">
                <Calendar className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">30-Minute Demo</h3>
                  <p className="text-gray-600">Quick but comprehensive walkthrough of all features</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Tailored to Your Business</h3>
                  <p className="text-gray-600">We&apos;ll focus on features most relevant to you</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">No Obligation</h3>
                  <p className="text-gray-600">Just a friendly conversation about your needs</p>
                </div>
              </div>
            </div>

            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle>What We&apos;ll Cover</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Live dashboard walkthrough
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    AI response generation demo
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Competitor tracking features
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    ROI calculation for your business
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Q&A and best practices
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Book Your Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="company"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="company_size" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size *
                    </label>
                    <Select
                      value={formData.company_size}
                      onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="current_solution" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Review Management Solution *
                    </label>
                    <Select
                      value={formData.current_solution}
                      onValueChange={(value) => setFormData({ ...formData, current_solution: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your current solution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No current solution</SelectItem>
                        <SelectItem value="manual">Manual tracking (spreadsheets, etc.)</SelectItem>
                        <SelectItem value="google">Google My Business only</SelectItem>
                        <SelectItem value="reputation">Reputation.com</SelectItem>
                        <SelectItem value="birdeye">BirdEye</SelectItem>
                        <SelectItem value="podium">Podium</SelectItem>
                        <SelectItem value="reviewtrackers">ReviewTrackers</SelectItem>
                        <SelectItem value="grade.us">Grade.us</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Anything specific you&apos;d like to see?
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Request Demo'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By requesting a demo, you agree to our privacy policy and to receive communications from Revu.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}