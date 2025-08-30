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
		name: 'Basic',
		price: 'FREE',
		description: 'Perfect for getting started',
		features: [
			'Up to 3 Platform connections',
			'Up to 1,000 AI Generated Responses/month',
			'Access to Repruv AI, your custom chat bot',
			'Basic Analytics',
			'Basic Social Monitoring',
		],
	},
	{
		name: 'Pro',
		price: '$34.99',
		description: 'Ideal for growing creators',
		features: [
			'Up to 5 Platform connections',
			'Up to 10,000 AI Generated Responses/month',
			'$15 per 10,000 for any extra responses',
			'Enhanced Repruv AI',
			'Advanced Analytics with AI-suggested actions',
		],
	},
	{
		name: 'Enterprise',
		price: 'Get Quote',
		description: 'For large creators and agencies',
		features: [
			'Heavy usage requirements supported',
			'Manage many channels',
			'Multi-user access',
			'Perfect for agencies managing creators',
			'Custom solutions available',
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
						<h2 className="text-4xl md:text-5xl font-bold text-green-500 mb-6">
							Intuitive Pricing
						</h2>
						<p className="text-xl text-green-800 font-bold">
							Simple pricing designed for creators and agencies of all sizes
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
								<Card className="card-background shadow-lg hover:shadow-xl transition-shadow h-full relative">
									{plan.name === 'Pro' && (
										<div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-2 text-sm font-semibold rounded-t-lg">
											⭐ Most Popular
										</div>
									)}
									<CardHeader className={plan.name === 'Pro' ? 'pt-12' : ''}>
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
											transition={{ delay: index * 0.15 + 0.1, duration: 0.5 }}
											className="text-center"
										>
											<CardTitle className="text-2xl md:text-3xl font-bold text-green-500">
												{plan.name}
											</CardTitle>
										</motion.div>
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
											transition={{ delay: index * 0.15 + 0.2, duration: 0.5 }}
											className="text-center"
										>
											<CardDescription className="text-green-800 font-bold">
												{plan.description}
											</CardDescription>
										</motion.div>
									</CardHeader>
									<CardContent>
										<motion.div 
											className="mb-6"
											initial={{ opacity: 0, scale: 0.8 }}
											animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
											transition={{ delay: index * 0.15 + 0.3, duration: 0.6 }}
										>
											<span className="text-4xl font-bold text-primary-dark">
												{plan.price}
											</span>
											{plan.price !== 'FREE' && plan.price !== 'Get Quote' && (
												<span className="text-secondary-dark">
													/month
												</span>
											)}
										</motion.div>
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
										<motion.div
											initial={{ opacity: 0, y: 30, scale: 0.9 }}
											animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
											transition={{ delay: index * 0.15 + 0.6, duration: 0.6 }}
											className="w-full"
										>
											<Button
												className="w-full bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-[var(--brand-primary-solid-foreground)] border-0"
												asChild
											>
												{plan.name === 'Enterprise' ? (
													<Link href="/demo">Request Demo</Link>
												) : (
													<Link href="/join-waitlist">Get Early Access</Link>
												)}
											</Button>
										</motion.div>
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
							Start with our free Basic plan or get early access to Pro and Enterprise tiers.
						</p>
					</motion.div>
				</div>
			</section>
		</LazyMotion>
	);
}