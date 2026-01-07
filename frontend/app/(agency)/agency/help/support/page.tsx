'use client';

import React, { useState, useEffect } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Clock,
  Send,
  HelpCircle,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock4,
  MessageSquare,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface SupportTicket {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  responses: TicketResponse[];
}

interface TicketResponse {
  id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
  author_name: string;
}

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
  {
    question: 'How do I invite team members?',
    answer: 'Go to Team from the user menu, click "Invite Team Member", enter their email and select their role (Admin or Member).',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes, you can export data from Reports section in various formats including CSV and PDF.',
  },
];

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock4 },
  waiting_response: { label: 'Awaiting Your Reply', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: CheckCircle2 },
};

// Check if currently within support hours (8am-10pm UTC every day)
function isWithinSupportHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return utcHour >= 8 && utcHour < 22;
}

export default function SupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new');
  const [ticketCategory, setTicketCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await fetch('/api/agency/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCategory || !subject || !message) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/agency/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: ticketCategory,
          subject,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Ticket #${data.ticket_number} submitted! We'll respond within 24 hours.`);
        setTicketCategory('');
        setSubject('');
        setMessage('');
        fetchTickets();
        setActiveTab('tickets');
      } else {
        throw new Error('Failed to submit ticket');
      }
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyToTicket = async (ticketId: string) => {
    if (!replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const response = await fetch(`/api/agency/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (response.ok) {
        toast.success('Reply sent!');
        setReplyMessage('');
        fetchTickets();
        // Refresh selected ticket
        const updatedResponse = await fetch(`/api/agency/support/tickets/${ticketId}`);
        if (updatedResponse.ok) {
          const updatedTicket = await updatedResponse.json();
          setSelectedTicket(updatedTicket);
        }
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (error) {
      console.error('Failed to reply:', error);
      toast.error('Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const openTickets = tickets.filter(t => ['open', 'in_progress', 'waiting_response'].includes(t.status));
  const closedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Support</h1>
          <p className="text-gray-600 dark:text-gray-400">Get help from our team</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contact Info */}
        <div className="space-y-4">
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
                <span className="text-gray-500">Every Day</span>
                <span className="font-medium">8:00 AM - 10:00 PM UTC</span>
              </div>
              <div className="pt-2 border-t">
                {isWithinSupportHours() ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                    Currently Online
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-gray-400 mr-2" />
                    Outside Support Hours
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Average response time: Under 4 hours during support hours
              </p>
            </CardContent>
          </Card>

          {/* Contact Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a 
                    href="mailto:support@repruv.co.uk" 
                    className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    support@repruv.co.uk
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                For urgent matters outside support hours, email us and we&apos;ll respond as soon as possible.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Quick Answers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100 pr-2">
                      {item.question}
                    </span>
                    <span className="text-gray-400 flex-shrink-0">
                      {expandedFaq === index ? '−' : '+'}
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Ticket System */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Support Tickets
              </CardTitle>
              <CardDescription>
                Submit a new ticket or view your existing conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="new">New Ticket</TabsTrigger>
                  <TabsTrigger value="tickets" className="relative">
                    My Tickets
                    {openTickets.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        {openTickets.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>

                {/* New Ticket Form */}
                <TabsContent value="new" className="mt-6">
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={ticketCategory} onValueChange={setTicketCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="What can we help with?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing Question</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="account">Account Management</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
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
                      <Label htmlFor="message">Description</Label>
                      <Textarea
                        id="message"
                        placeholder="Please provide as much detail as possible. Include steps to reproduce if reporting a bug..."
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-gray-500">
                        We typically respond within 24 hours
                      </p>
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 gap-2"
                        disabled={!ticketCategory || !subject || !message || isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Active Tickets */}
                <TabsContent value="tickets" className="mt-6">
                  {loadingTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : openTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No open tickets</h3>
                      <p className="text-sm text-gray-500">Submit a new ticket to get help from our team</p>
                    </div>
                  ) : selectedTicket ? (
                    <TicketDetail 
                      ticket={selectedTicket} 
                      onBack={() => setSelectedTicket(null)}
                      replyMessage={replyMessage}
                      setReplyMessage={setReplyMessage}
                      onReply={() => handleReplyToTicket(selectedTicket.id)}
                      isReplying={isReplying}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={fetchTickets}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                      {openTickets.map((ticket) => (
                        <TicketCard 
                          key={ticket.id} 
                          ticket={ticket} 
                          onClick={() => setSelectedTicket(ticket)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Resolved Tickets */}
                <TabsContent value="resolved" className="mt-6">
                  {loadingTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : closedTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No resolved tickets</h3>
                      <p className="text-sm text-gray-500">Your resolved tickets will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {closedTickets.map((ticket) => (
                        <TicketCard 
                          key={ticket.id} 
                          ticket={ticket} 
                          onClick={() => setSelectedTicket(ticket)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const hasUnreadResponse = ticket.status === 'waiting_response';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors hover:border-green-300 dark:hover:border-green-700 ${
        hasUnreadResponse 
          ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">#{ticket.ticket_number}</span>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{ticket.subject}</h4>
          <p className="text-sm text-gray-500 truncate">{ticket.message}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500">
            {new Date(ticket.updated_at).toLocaleDateString()}
          </p>
          {ticket.responses.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {ticket.responses.length} response{ticket.responses.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function TicketDetail({ 
  ticket, 
  onBack, 
  replyMessage, 
  setReplyMessage, 
  onReply, 
  isReplying 
}: { 
  ticket: SupportTicket; 
  onBack: () => void;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  onReply: () => void;
  isReplying: boolean;
}) {
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const isOpen = ['open', 'in_progress', 'waiting_response'].includes(ticket.status);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </button>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number}</span>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ticket.category}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{ticket.subject}</h3>
          </div>
          <p className="text-xs text-gray-500">
            Created {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Original Message */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500 mb-2">Your message:</p>
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{ticket.message}</p>
        </div>

        {/* Responses */}
        {ticket.responses.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-gray-500">Conversation:</p>
            {ticket.responses.map((response) => (
              <div
                key={response.id}
                className={`rounded-lg p-4 ${
                  response.is_staff
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    response.is_staff ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {response.is_staff ? '🎧 Support Team' : response.author_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(response.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{response.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reply Form */}
        {isOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Label htmlFor="reply" className="text-sm font-medium mb-2 block">Reply</Label>
            <Textarea
              id="reply"
              placeholder="Type your reply..."
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button
                onClick={onReply}
                disabled={!replyMessage.trim() || isReplying}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {isReplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isReplying ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
