'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  BookOpen,
  Video,
  MessageCircle,
  Send,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const faqItems = [
  {
    question: 'How do I add a new creator to my roster?',
    answer: 'Navigate to Creators > Add Creator, fill in their details, and click Save. You can also import creators in bulk via CSV.',
  },
  {
    question: 'Can I customize the pipeline stages?',
    answer: 'Yes! Go to Settings > Pipeline to add, remove, or rename stages to match your workflow.',
  },
  {
    question: 'How do scheduled reports work?',
    answer: 'When creating a report, you can set it to generate automatically daily, weekly, or monthly. Reports are emailed to specified recipients.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'We support all major credit cards via Stripe. For enterprise plans, we also offer invoice billing.',
  },
];

export default function SupportPage() {
  const [ticketType, setTicketType] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Support ticket submitted! We\'ll get back to you within 24 hours.');
    setTicketType('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contact Support</h1>
          <p className="text-gray-600 dark:text-gray-400">We&apos;re here to help</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Options */}
        <div className="lg:col-span-1 space-y-4">
          {/* Support Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Support Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monday - Friday</span>
                <span className="font-medium">9am - 6pm EST</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Saturday</span>
                <span className="font-medium">10am - 4pm EST</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
              <div className="pt-2 border-t">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  Currently Online
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Contact Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Other Ways to Reach Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-500">support@revu.agency</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Live Chat</p>
                  <p className="text-sm text-gray-500">Available during business hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone (Enterprise)</p>
                  <p className="text-sm text-gray-500">1-800-REVU-HELP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Self-Service Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/agency/help/documentation">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </Button>
              </Link>
              <Link href="/agency/help/tutorials">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Video className="h-4 w-4" />
                  Video Tutorials
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Support Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>
                Fill out the form below and we&apos;ll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket-type">What can we help you with?</Label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger id="ticket-type">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="account">Account Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Please provide as much detail as possible..."
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  disabled={!ticketType || !subject || !message}
                >
                  <Send className="h-4 w-4" />
                  Submit Ticket
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {item.question}
                    </span>
                    <span className="text-gray-400">
                      {expandedFaq === index ? '−' : '+'}
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
