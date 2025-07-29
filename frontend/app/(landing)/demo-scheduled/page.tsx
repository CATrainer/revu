"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineWidget } from "react-calendly";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Calendar, ArrowLeft, User, Mail, Lock, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

const DemoScheduledPage = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{name?: string; email?: string}>({});
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupData, setSignupData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user info from localStorage or URL params if available
    const savedUserInfo = localStorage.getItem('demoUserInfo');
    if (savedUserInfo) {
      const info = JSON.parse(savedUserInfo);
      setUserInfo(info);
      setSignupData(prev => ({
        ...prev,
        full_name: info.name || '',
        email: info.email || ''
      }));
    }

    // Listen for Calendly events
    const handleCalendlyEvent = (e: MessageEvent) => {
      if (e.data.event && e.data.event === 'calendly.event_scheduled') {
        // Meeting was scheduled! Show signup prompt
        setTimeout(() => {
          setShowSignupPrompt(true);
        }, 2000); // Small delay to let success animation play
      }
    };

    window.addEventListener('message', handleCalendlyEvent);
    return () => window.removeEventListener('message', handleCalendlyEvent);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (signupData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSigningUp(true);
    setError('');

    try {
      // Create account
      await api.post('/auth/signup', {
        email: signupData.email,
        password: signupData.password,
        full_name: signupData.full_name
      });

      // Auto-login after signup
      const loginData = new FormData();
      loginData.append('username', signupData.email);
      loginData.append('password', signupData.password);
      
      await api.post('/auth/login', loginData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Mark demo as requested for this user
      await api.post('/auth/request-demo', {});

      // Redirect to waiting area
      router.push('/waiting-area');
    } catch (err: unknown) {
      console.error('Signup error:', err);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = err as { response?: { data?: { detail?: string } } };
        errorMessage = errorResponse.response?.data?.detail || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen section-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-primary-dark mb-2">
              Demo Request Submitted Successfully!
            </h1>
            <p className="text-xl text-secondary-dark max-w-2xl mx-auto">
              Thank you for your interest in Revu. We&apos;re excited to show you how our platform can transform your review management strategy.
            </p>
          </div>

          {/* Calendly Widget */}
          <Card className="card-background mb-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-primary-dark">
                <Calendar className="h-6 w-6 icon-color" />
                Schedule Your Personalized Demo
              </CardTitle>
              <CardDescription className="text-secondary-dark">
                Choose a time that works best for you. Our team will be ready with a customized demonstration based on your specific needs and industry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InlineWidget
                url={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/revu-demo/30min"}
                styles={{ height: '700px' }}
                prefill={userInfo.name && userInfo.email ? {
                  name: userInfo.name,
                  email: userInfo.email
                } : undefined}
              />
            </CardContent>
          </Card>

          {/* Signup Prompt Modal - Shows after meeting is scheduled */}
          {showSignupPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md card-background">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Sparkles className="h-12 w-12 text-yellow-500" />
                  </div>
                  <CardTitle className="text-2xl text-primary-dark">Meeting Scheduled! 🎉</CardTitle>
                  <CardDescription className="text-secondary-dark">
                    Perfect! While you wait for your demo, why not create your Revu account to get early access to our platform?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="flex items-center gap-2 text-primary-dark">
                        <User className="h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        type="text"
                        value={signupData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="card-background"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="flex items-center gap-2 text-primary-dark">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={signupData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        className="card-background"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password" className="flex items-center gap-2 text-primary-dark">
                        <Lock className="h-4 w-4" />
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={signupData.password}
                        onChange={handleInputChange}
                        placeholder="Create a password (8+ characters)"
                        className="card-background"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword" className="text-primary-dark">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className="card-background"
                        required
                      />
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 button-secondary"
                        onClick={() => setShowSignupPrompt(false)}
                      >
                        Maybe Later
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 button-primary"
                        disabled={isSigningUp}
                      >
                        {isSigningUp ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="mt-4 p-3 brand-background rounded-lg">
                    <p className="text-sm text-primary-dark">
                      <strong>Get early access:</strong> Join our platform before your demo to explore features and prepare better questions!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* What to Expect */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card className="card-background">
              <CardHeader>
                <CardTitle className="text-primary-dark">What to Expect</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-body-dark">30-minute personalized walkthrough</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-body-dark">Live demonstration of AI-powered responses</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-body-dark">Custom dashboard overview for your industry</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-body-dark">ROI calculation specific to your business</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-body-dark">Q&A session tailored to your needs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-background">
              <CardHeader>
                <CardTitle className="text-primary-dark">Preparation Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="icon-color mr-2 mt-0.5">→</span>
                    <span className="text-body-dark">Have your current review platforms ready to discuss</span>
                  </li>
                  <li className="flex items-start">
                    <span className="icon-color mr-2 mt-0.5">→</span>
                    <span className="text-body-dark">Think about your biggest review management challenges</span>
                  </li>
                  <li className="flex items-start">
                    <span className="icon-color mr-2 mt-0.5">→</span>
                    <span className="text-body-dark">Consider your team size and workflow needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="icon-color mr-2 mt-0.5">→</span>
                    <span className="text-body-dark">Prepare any specific questions about features</span>
                  </li>
                  <li className="flex items-start">
                    <span className="icon-color mr-2 mt-0.5">→</span>
                    <span className="text-body-dark">Have stakeholders join if decision-making is collaborative</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Early Access CTA */}
          <Card className="button-primary mb-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2 text-white">
                  <Sparkles className="h-6 w-6" />
                  Get Early Access While You Wait
                </h3>
                <p className="mb-4 text-white/90">
                  Don&apos;t wait for the demo! Create your Revu account now and start exploring our platform. 
                  You&apos;ll be better prepared for the demonstration and can begin optimizing your review strategy immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="secondary" 
                    className="bg-white text-[hsl(263,70%,68%)] hover:bg-gray-100"
                    onClick={() => setShowSignupPrompt(true)}
                  >
                    Create Account Now
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-[hsl(263,70%,68%)]"
                    onClick={() => router.push('/login')}
                  >
                    Already Have an Account?
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          <Card className="card-background-light">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-primary-dark">Can&apos;t find a suitable time right now?</h3>
                <p className="text-secondary-dark mb-4">
                  No worries! You can always schedule your demo later or reach out to us directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="button-secondary" onClick={() => window.location.href = 'mailto:demo@revu.com'}>
                    Email Us Instead
                  </Button>
                  <Button variant="outline" className="button-secondary" onClick={() => window.location.href = '/'}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to Homepage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-dark">
              You&apos;ll receive a confirmation email with meeting details once you schedule your demo.
              <br />
              Have questions? Contact us at{" "}
              <a href="mailto:support@revu.com" className="brand-text hover:underline">
                support@revu.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoScheduledPage;
