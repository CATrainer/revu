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
		priceDetail: 'Free forever',
		popular: false,
		buttonText: 'Get Early Access',
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
		price: '$35',
		description: 'Ideal for growing creators',
		priceDetail: 'per month, billed monthly',
		popular: true,
		savePercentage: '20%',
		annualPrice: '$28',
		buttonText: 'Get Early Access',
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
		price: 'Custom',
		description: 'For large creators and agencies',
		priceDetail: 'Custom pricing for your needs',
		popular: false,
		buttonText: 'Get Early Access',
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
	const [isAnnual, setIsAnnual] = React.useState(false);

	return (
		<LazyMotion features={domAnimation}>
			<section id="pricing" ref={ref} className="py-16 section-background-alt">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
					<motion.div 
						className="text-center mb-12"
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
							No hidden fees
						</motion.span>
						<h2 className="text-3xl md:text-4xl font-bold text-green-500 mb-3">
							Scalable &amp; Intuitive Pricing
						</h2>
						<p className="text-lg text-green-800 font-medium max-w-2xl mx-auto mb-2">
							Choose your perfect plan as a creator or agency of any size
						</p>
						<p className="text-gray-600 max-w-lg mx-auto mb-4">
							All plans include core features, with flexible options as you grow. Cancel anytime.
						</p>
						
						<div className="flex items-center justify-center mb-6">
							<span className={`text-sm font-medium mr-3 ${!isAnnual ? 'text-green-600' : 'text-gray-500'}`}>Monthly</span>
							<button 
								onClick={() => setIsAnnual(!isAnnual)} 
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 ${isAnnual ? 'bg-green-500' : 'bg-gray-300'}`}
								role="switch"
								aria-checked={isAnnual}
							>
								<span className="sr-only">Toggle annual billing</span>
								<span 
									className={`${isAnnual ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
								/>
							</button>
							<div className="flex items-center ml-3">
								<span className={`text-sm font-medium mr-2 ${isAnnual ? 'text-green-600' : 'text-gray-500'}`}>Annual</span>
								<span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Save 20%</span>
							</div>
						</div>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
						{plans.map((plan, index) => (
							<motion.div
								key={plan.name}
								initial={{ opacity: 0, y: 40 }}
								animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
								transition={{ delay: index * 0.15, duration: 0.6 }}
								whileHover={{ 
									scale: plan.popular ? 1.03 : 1.02,
									transition: { duration: 0.2 }
								}}
								whileTap={{ 
									scale: 0.98,
									transition: { duration: 0.1 }
								}}
								className={`cursor-pointer ${plan.popular ? 'z-10' : 'z-0'}`}
							>
								<Card 
									className={`${plan.popular ? 'shadow-xl ring-2 ring-green-500 scale-103' : 'shadow-lg'} card-background hover:shadow-xl transition-all duration-300 h-full relative`}
								>
									{plan.popular && (
										<div className="absolute -top-4 left-0 right-0 mx-auto w-max px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-center text-xs font-semibold rounded-full shadow-md">
											⭐ BEST VALUE
										</div>
									)}
									<CardHeader className={plan.popular ? 'pt-6 pb-4' : 'pt-5 pb-4'}>
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
											transition={{ delay: index * 0.15 + 0.1, duration: 0.5 }}
											className="text-center"
										>
											<CardTitle className={`text-2xl md:text-3xl font-bold ${plan.name === 'Pro' ? 'text-green-600' : 'text-green-500'} text-center`}>
												{plan.name}
											</CardTitle>
										</motion.div>
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
											transition={{ delay: index * 0.15 + 0.2, duration: 0.5 }}
											className="text-center"
										>
											<CardDescription className="text-green-800 font-bold mt-1 text-base md:text-lg">
												{plan.description}
											</CardDescription>
										</motion.div>
									</CardHeader>
									<CardContent className="px-6 py-4">
										<motion.div 
											className="mb-4"
											initial={{ opacity: 0, scale: 0.8 }}
											animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
											transition={{ delay: index * 0.15 + 0.3, duration: 0.6 }}
										>
											<div className="flex items-center pl-3">
												{plan.price === 'FREE' && (
													<span className={`text-2xl font-bold text-green-800`}>
														{plan.price}
													</span>
												)}
												
												{plan.price !== 'FREE' && plan.price !== 'Custom' && (
													<>
														<span className={`text-2xl font-bold text-green-800`}>
															{isAnnual && plan.annualPrice ? plan.annualPrice : plan.price}
														</span>
														<span className="text-secondary-dark ml-1 font-medium text-base">
															/mo
														</span>
													</>
												)}
												
												{plan.price === 'Custom' && (
													<span className={`text-2xl font-bold text-green-800`}>
														{plan.price}
													</span>
												)}
											</div>
											
											<p className="text-sm text-gray-500 mt-2 pl-3">
												{plan.name === 'Pro' && isAnnual 
													? 'per month, billed annually' 
													: plan.priceDetail}
											</p>
											
											{plan.popular && plan.savePercentage && plan.annualPrice && !isAnnual && (
												<div className="mt-3 bg-green-50 text-green-800 rounded-full px-4 py-1.5 inline-flex items-center">
													<span className="text-xs font-semibold mr-1">Save {plan.savePercentage}:</span>
													<span className="text-sm font-bold">{plan.annualPrice}/mo</span>
													<span className="text-xs ml-1">billed annually</span>
												</div>
											)}
										</motion.div>
										
										<ul className="space-y-3 mt-4">
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
													<div className={`flex-shrink-0 h-5 w-5 rounded-full ${plan.popular ? 'bg-green-100' : 'bg-green-100'} flex items-center justify-center mr-3 mt-0.5`}>
														<Check className={`h-3 w-3 text-green-500`} />
													</div>
													<span className="text-secondary-dark text-sm leading-relaxed">
														{feature}
													</span>
												</motion.li>
											))}
										</ul>
									</CardContent>
									<CardFooter className="pt-3 pb-6 px-6">
										<motion.div
											initial={{ opacity: 0, y: 30, scale: 0.9 }}
											animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
											transition={{ delay: index * 0.15 + 0.6, duration: 0.6 }}
											className="w-full"
										>
											<Button
												className="w-full bg-green-600 hover:bg-green-700 text-white border-0 py-4 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
												asChild
											>
												<Link href={'/join-waitlist'}>
													{plan.buttonText}
												</Link>
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
						<div className="bg-white/80 backdrop-blur-sm max-w-3xl mx-auto py-4 px-6 rounded-2xl shadow-md border border-gray-100">
							<div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
								<div className="text-left">
									<h3 className="text-lg font-semibold text-gray-900 mb-1">Got questions about pricing?</h3>
									<p className="text-gray-600 text-sm">Our team is ready to help you choose the perfect plan</p>
								</div>
								<div className="flex flex-col sm:flex-row gap-2">
									<Button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 text-sm">
										<Link href="/contact">Contact Sales</Link>
									</Button>
									<Button className="bg-white border border-green-500 text-green-600 hover:bg-green-50 py-3 px-4 text-sm">
										<Link href="/contact">Request Custom Quote</Link>
									</Button>
								</div>
							</div>
						</div>
						
						<div className="mt-8 flex flex-wrap items-center justify-center gap-6">
							<div className="flex items-center gap-2">
								<Check className="h-5 w-5 text-green-500" />
								<span className="text-gray-600 text-sm">No credit card required</span>
							</div>
							<div className="flex items-center gap-2">
								<Check className="h-5 w-5 text-green-500" />
								<span className="text-gray-600 text-sm">Cancel anytime</span>
							</div>
							<div className="flex items-center gap-2">
								<Check className="h-5 w-5 text-green-500" />
								<span className="text-gray-600 text-sm">Premium support</span>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</LazyMotion>
	);
}