import { faker } from '@faker-js/faker';
import type { Comment, Interaction, Platform, Review, Sentiment, Workspace } from './types';

// Helper utilities
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const sentiments: Sentiment[] = ['Positive', 'Negative', 'Neutral', 'Mixed'];
const creatorPlatforms: Platform[] = ['YouTube', 'Instagram', 'TikTok'];
const businessPlatforms: Platform[] = ['Google', 'Facebook', 'X/Twitter'];

export function getDemoWorkspaces(flavor: 'default' | 'agency-creators' | 'agency-businesses' = 'default'): Workspace[] {
  const common: Workspace[] = [
    { id: 'alex', name: 'Alex the Foodie', type: 'Individual' },
    { id: 'bella', name: "Bella's Bistro", type: 'Organization' },
  ];
  if (flavor === 'agency-creators') {
    return [
      ...common,
      { id: 'agency', name: 'Agency: 5 creators', type: 'Agency', clientsCount: 5, agencyFlavor: 'creators' },
    ];
  }
  if (flavor === 'agency-businesses') {
    return [
      ...common,
      { id: 'agency', name: 'Agency: 5 businesses', type: 'Agency', clientsCount: 5, agencyFlavor: 'businesses' },
    ];
  }
  return [
    ...common,
    { id: 'agency', name: 'Agency: 5 clients', type: 'Agency', clientsCount: 5, agencyFlavor: 'mixed' },
  ];
}

function randomPastDate(days = 90) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * days));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

function makeAuthor(i: number) {
  const followers = faker.number.int({ min: 0, max: 1_500_000 });
  return {
    id: `u_${i}_${faker.string.alphanumeric(6)}`,
    name: faker.person.fullName(),
    avatarUrl: `https://i.pravatar.cc/150?u=${i}`,
    followers,
    verified: followers > 200_000 && Math.random() < 0.2,
  };
}

export function generateCreatorInteractions(count = 520, workspaceId = 'alex'): Interaction[] {
  const topics = [
    'pasta', 'ramen', 'sourdough', 'bbq', 'salmon', 'salad', 'vegan', 'air fryer', 'meal prep', 'street food',
  ];

  const items: Interaction[] = [];
  range(count).forEach((i) => {
    const platform = pick(creatorPlatforms);
    const sentiment = pick(sentiments);
    const base: Comment = {
      kind: 'comment',
      id: `c_${workspaceId}_${i}`,
      platform,
      author: makeAuthor(i),
      content:
        faker.lorem.paragraph({ min: 1, max: 4 }) +
        (Math.random() < 0.15 ? ' 🔥💯😍' : ''),
      createdAt: randomPastDate(90),
      sentiment,
      status: pick(['Unread', 'Needs Response', 'Responded', 'Archived']),
      priority: Math.random() < 0.08 ? 'high' : Math.random() < 0.25 ? 'medium' : 'low',
      replyCount: Math.random() < 0.25 ? faker.number.int({ min: 1, max: 8 }) : 0,
      workspaceId,
      threadId: Math.random() < 0.2 ? faker.string.alphanumeric(8) : undefined,
    };
    items.push(base);
  });

  // Add celebrity comment and very long comment edge cases
  items.push({
    kind: 'comment',
    id: `c_${workspaceId}_celebrity`,
    platform: 'Instagram',
    author: {
      id: 'celebrity_1',
      name: 'Gordon Ramsay (Verified)',
      avatarUrl: `https://i.pravatar.cc/150?u=celebrity`,
      followers: 15_000_000,
      verified: true,
    },
    content: 'Absolutely smashing presentation, love the technique here! 🔥',
    createdAt: randomPastDate(7),
    sentiment: 'Positive',
    status: 'Unread',
    priority: 'high',
    replyCount: 2,
    workspaceId,
  });

  items.push({
    kind: 'comment',
    id: `c_${workspaceId}_long`,
    platform: 'YouTube',
    author: makeAuthor(9999),
    content: faker.lorem.paragraphs({ min: 8, max: 12 }),
    createdAt: randomPastDate(20),
    sentiment: 'Neutral',
    status: 'Needs Response',
    priority: 'medium',
    workspaceId,
  });

  // Simulate viral video recent spike
  range(300).forEach((i) => {
    items.push({
      kind: 'comment',
      id: `c_${workspaceId}_viral_${i}`,
      platform: 'TikTok',
      author: makeAuthor(10000 + i),
      content: `Viral vid reaction: ${pick(topics)} is awesome!` + (Math.random() < 0.3 ? ' 😍' : ''),
      createdAt: new Date(Date.now() - faker.number.int({ min: 0, max: 72 }) * 3600 * 1000).toISOString(),
      sentiment: pick(['Positive', 'Mixed', 'Neutral']),
      status: 'Unread',
      priority: Math.random() < 0.05 ? 'high' : 'low',
      workspaceId,
    });
  });

  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function generateBusinessReviews(count = 220, workspaceId = 'bella'): Interaction[] {
  const ratingsPool = [
    ...Array(60).fill(5),
    ...Array(20).fill(4),
    ...Array(10).fill(3),
    ...Array(7).fill(2),
    ...Array(3).fill(1),
  ];
  const locations = ['Downtown', 'Riverside', 'Uptown'];
  const dishes = ['Margherita Pizza', 'Truffle Pasta', 'Seared Salmon', 'Lemon Tart', 'Tiramisu'];

  const items: Interaction[] = ratingsPool.slice(0, count).map((r, i) => {
    const rating = r as 1 | 2 | 3 | 4 | 5;
    const sentiment: Sentiment = rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative';
    const crisis = Math.random() < 0.02;
    const content = crisis
      ? 'I think I got food poisoning after eating here last night. This needs to be addressed!'
      : `${faker.person.firstName()} mentioned ${pick(dishes)} and ${faker.person.lastName()} in their review. ${faker.lorem.sentence()}`;

    const review: Review = {
      kind: 'review',
      id: `r_${workspaceId}_${i}`,
      platform: pick(businessPlatforms),
      author: {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        avatarUrl: `https://i.pravatar.cc/150?u=${workspaceId}_${i}`,
      },
  content: content + (Math.random() < 0.1 ? ' 🔥💯😍' : ''),
      createdAt: randomPastDate(90),
      sentiment,
      status: pick(['Unread', 'Needs Response', 'Responded', 'Archived']),
      priority: crisis ? 'high' : Math.random() < 0.15 ? 'medium' : 'low',
      rating,
      location: pick(locations),
      ownerResponse: Math.random() < 0.35 ? { content: faker.lorem.sentences(2), createdAt: randomPastDate(60) } : undefined,
      workspaceId,
    };

    return review;
  });

  // Edge cases
  items.push({
    kind: 'review',
    id: `r_${workspaceId}_very_long`,
    platform: 'Google',
    author: { id: faker.string.uuid(), name: faker.person.fullName() },
    content: faker.lorem.paragraphs(10),
    createdAt: randomPastDate(15),
    sentiment: 'Negative',
    status: 'Needs Response',
    priority: 'high',
    rating: 1,
    location: 'Downtown',
    workspaceId,
  });

  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function generateAgencyMix(workspaceId = 'agency', flavor: 'creators' | 'businesses' | 'mixed' = 'mixed'): Interaction[] {
  const clients = getAgencyClients(flavor);
  const items: Interaction[] = [];
  clients.forEach((c, idx) => {
    const creator = flavor === 'creators' ? true : flavor === 'businesses' ? false : Math.random() < 0.5;
    const subset = creator
      ? generateCreatorInteractions(faker.number.int({ min: 40, max: 120 }), `${workspaceId}_${idx}`)
      : generateBusinessReviews(faker.number.int({ min: 20, max: 80 }), `${workspaceId}_${idx}`);
    items.push(
      ...subset.map((i) => ({
        ...i,
        workspaceId,
        // Always tag with client for easier filtering/aggregation in UI
        content: `${i.content} (Client: ${c})`,
      }))
    );
  });
  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function generateAllDemoData(flavor: 'default' | 'agency-creators' | 'agency-businesses' = 'default') {
  const workspaces = getDemoWorkspaces(flavor);
  const agencyFlavor = flavor === 'agency-creators' ? 'creators' : flavor === 'agency-businesses' ? 'businesses' : 'mixed';
  const interactions = [
    ...generateCreatorInteractions(540, 'alex'),
    ...generateBusinessReviews(240, 'bella'),
    ...generateAgencyMix('agency', agencyFlavor),
  ];
  return { workspaces, interactions };
}

// Expose the list of demo agency clients for use in the Clients module
export function getAgencyClients(flavor: 'creators' | 'businesses' | 'mixed' = 'mixed'): string[] {
  if (flavor === 'creators') return ['TechTuber Tim', 'Yoga With Mia', 'Gadget Guru', 'Style by Ana', 'Daily Fitness'];
  if (flavor === 'businesses') return ['Cafe Roma', 'Bella Nails', 'Burger Hub', 'GreenGrocer', 'City Dental'];
  // mixed
  return ['Cafe Roma', 'TechTuber Tim', 'Yoga With Mia', 'Bella Nails', 'Burger Hub'];
}
