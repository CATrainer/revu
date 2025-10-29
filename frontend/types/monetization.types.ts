// frontend/types/monetization.types.ts

export type Profile = {
  id: string;
  name: string;
  platform: string;
  followers: number;
  avgViews: number;
  engagementRate: number;
  contentCount: number;
  engagedComments: number;
  description: string;
};

export type Step = {
  task: string;
  time: string;
  cost: number | string;
  details: string;
  resources?: string[];
  proTip?: string;
  commonPitfall?: string;
};

export type Phase = {
  phase: string;
  timeline: string;
  steps: Step[];
};

export type SuccessStory = {
  creator: string;
  followers: string;
  quote: string;
  revenue: string;
  timeToScale: string;
};

export type Opportunity = {
  id: string;
  title: string;
  icon: string;
  revenueMin: number;
  revenueMax: number;
  confidence: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high' | 'very-high';
  timeline: string;
  category: string;
  tagline: string;
  metrics: {
    contentPerformance: string;
    audienceSignals: string;
    competitiveBenchmark: string;
  };
  whyThisWorks: string[];
  implementationPhases: Phase[];
  successMetrics: string[];
  whatYouNeed: {
    tools: string[];
    timeCommitment: string;
    upfrontCost: string;
    breakEven: string;
  };
  successStories: SuccessStory[];
};

export type OpportunityPool = {
  influencer: Opportunity[];
  wellness: Opportunity[];
  gaming: Opportunity[];
};
