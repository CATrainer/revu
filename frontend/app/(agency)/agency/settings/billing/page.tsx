'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Loader2,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/lib/auth';

// Types
interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'free' | 'creator' | 'agency' | 'enterprise';
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  features: string[];
  max_creators: number | null;
  max_campaigns: number | null;
  max_ai_messages_monthly: number | null;
  is_popular: boolean;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}

interface UserSubscription {
  id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'paused';
  plan_name: string | null;
  plan_type: string | null;
  billing_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_active: boolean;
  is_trial: boolean;
  days_until_renewal: number | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  invoice_date: string;
  paid_at: string | null;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
}

interface BillingOverview {
  subscription: UserSubscription | null;
  payment_methods: PaymentMethod[];
  recent_invoices: Invoice[];
  available_plans: SubscriptionPlan[];
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const { formatAmount, currency: userCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  
  // Get token from localStorage (managed by api interceptor)
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  };
  
  const formatCurrency = useCallback((amount: number, currency?: string) => {
    return formatAmount(amount, currency || userCurrency);
  }, [formatAmount, userCurrency]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Fetch billing overview
  useEffect(() => {
    const fetchBillingData = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/billing/overview', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBillingData(data);
        } else {
          // If no subscription data, fetch just plans
          const plansResponse = await fetch('/api/billing/plans');
          if (plansResponse.ok) {
            const plans = await plansResponse.json();
            setBillingData({
              subscription: null,
              payment_methods: [],
              recent_invoices: [],
              available_plans: plans,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
        toast.error('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [isAuthenticated]);

  // Handle checkout
  const handleCheckout = async (plan: SubscriptionPlan) => {
    const token = getToken();
    if (!token) {
      toast.error('Please log in to subscribe');
      return;
    }

    const priceId = billingInterval === 'year' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      toast.error('This plan is not available for purchase yet');
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/agency/settings/billing?success=true`,
          cancel_url: `${window.location.origin}/agency/settings/billing?canceled=true`,
          trial_days: plan.plan_type === 'free' ? 0 : 14,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle manage subscription (customer portal)
  const handleManageSubscription = async () => {
    const token = getToken();
    if (!token) return;

    setPortalLoading(true);

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/agency/settings/billing`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
      window.history.replaceState({}, '', '/agency/settings/billing');
    } else if (params.get('canceled') === 'true') {
      toast.info('Checkout was canceled');
      window.history.replaceState({}, '', '/agency/settings/billing');
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const currentPlan = billingData?.available_plans.find(
    p => p.plan_type === billingData?.subscription?.plan_type
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your subscription and payment methods</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan / Plans List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Subscription */}
          {billingData?.subscription && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your active subscription</CardDescription>
                  </div>
                  {getStatusBadge(billingData.subscription.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">
                    {currentPlan ? formatCurrency(
                      billingData.subscription.billing_interval === 'year' 
                        ? (currentPlan.price_yearly || currentPlan.price_monthly * 12)
                        : currentPlan.price_monthly,
                      currentPlan.currency
                    ) : 'Free'}
                  </span>
                  {billingData.subscription.billing_interval && (
                    <span className="text-gray-500">/{billingData.subscription.billing_interval}</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-3">
                  {billingData.subscription.plan_name || 'Free'} Plan
                </h3>
                
                {currentPlan && (
                  <ul className="space-y-2 mb-6">
                    {currentPlan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {billingData.subscription.current_period_end && (
                  <p className="text-sm text-gray-500 mb-4">
                    {billingData.subscription.cancel_at_period_end 
                      ? `Cancels on ${formatDate(billingData.subscription.current_period_end)}`
                      : `Renews on ${formatDate(billingData.subscription.current_period_end)}`
                    }
                    {billingData.subscription.days_until_renewal !== null && (
                      <span> ({billingData.subscription.days_until_renewal} days)</span>
                    )}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    {portalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Manage Subscription
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    {billingData?.subscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
                  </CardTitle>
                  <CardDescription>
                    {billingData?.subscription 
                      ? 'Get more features with an upgraded plan' 
                      : 'Start with a plan that fits your needs'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setBillingInterval('month')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      billingInterval === 'month'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingInterval('year')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      billingInterval === 'year'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Yearly
                    <span className="ml-1 text-xs text-green-600">Save 17%</span>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {billingData?.available_plans.map((plan) => {
                  const isCurrentPlan = billingData?.subscription?.plan_type === plan.plan_type;
                  const price = billingInterval === 'year' && plan.price_yearly
                    ? plan.price_yearly / 12 
                    : plan.price_monthly;

                  return (
                    <div
                      key={plan.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        plan.is_popular 
                          ? 'border-blue-500 dark:border-blue-400 shadow-lg' 
                          : 'border-gray-200 dark:border-gray-700'
                      } ${isCurrentPlan ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      {plan.is_popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-blue-500 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold">
                          {formatCurrency(price, plan.currency)}
                        </span>
                        <span className="text-gray-500">/month</span>
                        {billingInterval === 'year' && plan.price_yearly && (
                          <p className="text-xs text-gray-500">
                            Billed {formatCurrency(plan.price_yearly, plan.currency)}/year
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2 mb-4">
                        {plan.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-sm text-gray-500">
                            +{plan.features.length - 4} more features
                          </li>
                        )}
                      </ul>

                      {isCurrentPlan ? (
                        <Button className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : plan.plan_type === 'free' ? (
                        <Button variant="outline" className="w-full" disabled>
                          Free Forever
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={plan.is_popular ? 'default' : 'outline'}
                          onClick={() => handleCheckout(plan)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {billingData?.subscription ? 'Upgrade' : 'Get Started'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          {billingData?.recent_invoices && billingData.recent_invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Billing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                      <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Invoice</th>
                      <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.recent_invoices.map(invoice => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">{formatDate(invoice.invoice_date)}</td>
                        <td className="p-3 font-mono text-sm">{invoice.invoice_number || '-'}</td>
                        <td className="p-3">{formatCurrency(invoice.amount_paid, invoice.currency)}</td>
                        <td className="p-3">
                          {invoice.status === 'paid' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline">{invoice.status}</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {invoice.invoice_pdf_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(invoice.invoice_pdf_url!, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Method & Next Payment */}
        <div className="space-y-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingData?.payment_methods && billingData.payment_methods.length > 0 ? (
                <>
                  {billingData.payment_methods.map(pm => (
                    <div key={pm.id} className="p-4 border rounded-lg mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                          <span className="font-medium capitalize">{pm.brand || pm.type}</span>
                        </div>
                        {pm.is_default && <Badge variant="outline">Default</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">
                        •••• •••• •••• {pm.last4}
                      </p>
                      {pm.exp_month && pm.exp_year && (
                        <p className="text-sm text-gray-500">
                          Expires {pm.exp_month}/{pm.exp_year}
                        </p>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    {portalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Payment Method
                  </Button>
                </>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-4">
                    No payment method on file
                  </p>
                  <p className="text-xs text-gray-400">
                    Add a payment method when you subscribe to a paid plan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Payment */}
          {billingData?.subscription?.is_active && billingData.subscription.current_period_end && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {billingData.subscription.cancel_at_period_end ? (
                  <>
                    <p className="text-lg font-semibold text-yellow-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Subscription Ending
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Your subscription will end on{' '}
                      {formatDate(billingData.subscription.current_period_end)}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Reactivate Subscription
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {currentPlan && formatCurrency(
                        billingData.subscription.billing_interval === 'year'
                          ? (currentPlan.price_yearly || currentPlan.price_monthly * 12)
                          : currentPlan.price_monthly,
                        currentPlan.currency
                      )}
                    </p>
                    <p className="text-gray-500">
                      Due on {formatDate(billingData.subscription.current_period_end)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Need Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Questions about billing or your subscription?
              </p>
              <Link href="/agency/help/support">
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
