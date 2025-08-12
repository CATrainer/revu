// frontend/components/landing/Pricing.tsx
'use client';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
	{
		name: 'Essentials',
		price: '£79',
		description: 'Perfect for single-location businesses',
		features: [
			'1 location',
			'Google Reviews integration',
			'500 AI responses/month',
			'Basic analytics',
			'Email support',
		],
	},
	{
		name: 'Professional',
		price: '£179',
		description: 'Ideal for growing businesses',
		features: [
			'Up to 3 locations',
			'Google + Social monitoring',
			'2,000 AI responses/month',
			'Advanced analytics',
			'Competitor tracking',
			'Priority support',
		],
	},
	{
		name: 'Enterprise',
		price: '£399',
		description: 'For multi-location operations',
		features: [
			'5 locations included',
			'All platform integrations',
			'Unlimited AI responses',
			'Custom AI training',
			'API access',
			'Dedicated account manager',
		],
	},
];

export function Pricing() {

	return (
	<section className="py-24 section-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
		    <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
						Simple, Transparent Pricing
					</h2>
		    <p className="text-lg text-secondary-dark">
						Choose the plan that grows with your business
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{plans.map((plan) => (
						<Card
							key={plan.name}
			    className="card-background shadow-lg hover:shadow-xl transition-shadow"
						>
							<CardHeader>
				<CardTitle className="text-primary-dark">
									{plan.name}
								</CardTitle>
				<CardDescription className="text-secondary-dark">
									{plan.description}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="mb-6">
				    <span className="text-4xl font-bold text-primary-dark">
										{plan.price}
									</span>
				    <span className="text-secondary-dark">
										/month
									</span>
								</div>
								<ul className="space-y-3">
									{plan.features.map((feature, index) => (
										<li key={index} className="flex items-start">
					    <Check className="h-5 w-5 icon-color mr-2 flex-shrink-0" />
					    <span className="text-secondary-dark">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter>
								<Button
									className="w-full bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-[var(--brand-primary-solid-foreground)] border-0"
									asChild
								>
									<Link href="/join-waitlist">Join Waiting List</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>

				<div className="mt-12 text-center">
		    <p className="text-secondary-dark">
						Join our waiting list to be first to access these plans when we
						launch.
					</p>
				</div>
			</div>
		</section>
	);

}