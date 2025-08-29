// frontend/components/landing/Pricing.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
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
	const ref = React.useRef(null);
	const isInView = useInView(ref, { once: false, amount: 0.2 });

	return (
		<LazyMotion features={domAnimation}>
			<section id="pricing" ref={ref} className="py-24 section-background-alt">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div 
						className="text-center mb-16"
						initial={{ opacity: 0, y: 30 }}
						animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
						transition={{ duration: 0.6 }}
					>
						<h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
							Intuitive Pricing
						</h2>
						<p className="text-lg text-secondary-dark">
							Choose the plan that grows with your business
						</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{plans.map((plan, index) => (
							<motion.div
								key={plan.name}
								initial={{ opacity: 0, y: 40 }}
								animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
								transition={{ delay: index * 0.15, duration: 0.6 }}
								whileHover={{ 
									scale: 1.05,
									transition: { duration: 0.2 }
								}}
								whileTap={{ 
									scale: 0.98,
									transition: { duration: 0.1 }
								}}
								className="cursor-pointer"
							>
								<Card className="card-background shadow-lg hover:shadow-xl transition-shadow h-full">
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
											{plan.features.map((feature, featureIndex) => (
												<motion.li 
													key={featureIndex} 
													className="flex items-start"
													initial={{ opacity: 0, x: -20 }}
													animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
													transition={{ 
														delay: index * 0.15 + featureIndex * 0.1 + 0.3, 
														duration: 0.4 
													}}
												>
													<Check className="h-5 w-5 icon-color mr-2 flex-shrink-0" />
													<span className="text-secondary-dark">
														{feature}
													</span>
												</motion.li>
											))}
										</ul>
									</CardContent>
									<CardFooter>
										<Button
											className="w-full bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-[var(--brand-primary-solid-foreground)] border-0"
											asChild
										>
											<Link href="/join-waitlist">Get Early Access</Link>
										</Button>
									</CardFooter>
								</Card>
							</motion.div>
						))}
					</div>

					<motion.div 
						className="mt-12 text-center"
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
						transition={{ delay: 0.8, duration: 0.6 }}
					>
						<p className="text-secondary-dark">
							Get early access to be first to access these plans when we
							launch.
						</p>
					</motion.div>
				</div>
			</section>
		</LazyMotion>
	);
}