"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
import { Mail, ArrowRight, Send, ChevronRight, Globe, Clock, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function ContactPage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    reason: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, reason: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // This would connect to your actual API endpoint
      // For now we're just simulating a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Something went wrong. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 py-16">
        <div className="container mx-auto px-4 max-w-6xl" ref={ref}>
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <motion.span 
              className="text-sm uppercase tracking-wider font-semibold text-green-600 mb-2 inline-block"
              initial={{ opacity: 0, y: -10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              We&apos;re here to help
            </motion.span>
            <h1 className="text-4xl md:text-5xl font-bold text-green-600 mb-4">
              Get In Touch With Our Team
            </h1>
            <p className="text-xl text-green-800 font-medium max-w-2xl mx-auto mb-2">
              Have questions or need assistance? We&apos;re just a message away
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-700 dark:text-green-500">Send Us A Message</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Fill out the form below and we&apos;ll get back to you within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {success ? (
                    <motion.div 
                      className="text-center py-8"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-green-700 dark:text-green-500 mb-2">Message Sent Successfully!</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Thank you for reaching out. We&apos;ll respond to your message shortly.
                      </p>
                      <Button onClick={() => setSuccess(false)} className="bg-green-600 hover:bg-green-700 text-white">
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md flex items-center gap-2 text-sm">
                          <AlertCircle className="w-5 h-5" />
                          <span>{error}</span>
                        </div>
                      )}
                      
                      <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name}
                          onChange={handleChange} 
                          placeholder="Your name"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={formData.email}
                          onChange={handleChange} 
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="reason">How can we help?</Label>
                        <Select value={formData.reason} onValueChange={handleSelectChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason for contact" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="sales">Sales Question</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="billing">Billing Issue</SelectItem>
                            <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input 
                          id="subject" 
                          name="subject" 
                          value={formData.subject}
                          onChange={handleChange} 
                          placeholder="What's this about?"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea 
                          id="message" 
                          name="message" 
                          value={formData.message}
                          onChange={handleChange} 
                          placeholder="Tell us how we can help..."
                          className="min-h-[120px]"
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Send Message
                          </span>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-6"
            >
              {/* Contact Information Card */}
              <Card className="shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-700 dark:text-green-500">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                      <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                      <a href="mailto:support@repruv.co.uk" className="text-green-600 dark:text-green-400 hover:underline">
                        support@repruv.co.uk
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Support Hours</p>
                      <p className="text-gray-700 dark:text-gray-300">Monday - Friday, 9am - 5pm GMT</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                      <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</p>
                      <a href="https://repruv.co.uk" className="text-green-600 dark:text-green-400 hover:underline">
                        repruv.co.uk
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions Card */}
              <Card className="shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-700 dark:text-green-500">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-between">
                    <Link href="/join-waitlist">
                      <span className="flex items-center">
                        <span>Join the Waitlist</span>
                      </span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 flex items-center justify-between">
                    <Link href="/join-waitlist">
                      <span className="flex items-center">
                        <span>Get Early Access</span>
                      </span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 flex items-center justify-between">
                    <Link href="/help">
                      <span className="flex items-center">
                        <span>Help Center</span>
                      </span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* FAQs Preview Section */}
          <motion.div 
            className="mt-20"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-green-700 dark:text-green-500 mb-2">Frequently Asked Questions</h2>
              <p className="text-gray-600 dark:text-gray-400">Find quick answers to common questions</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-white/80 dark:bg-gray-900/80 shadow hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">How quickly will I get a response?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    We aim to respond to all inquiries within 24 business hours. For urgent matters, please indicate in your message.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 dark:bg-gray-900/80 shadow hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Can I upgrade my plan later?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 dark:bg-gray-900/80 shadow hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Do you offer custom solutions?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Yes, our Enterprise plan can be tailored to your specific needs. Contact us for a custom quote.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-8">
              <Button asChild variant="outline" className="border-green-200 text-green-700 dark:border-green-900 dark:text-green-400">
                <Link href="/pricing" className="flex items-center gap-1">
                  View All FAQs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </LazyMotion>
  );
}
