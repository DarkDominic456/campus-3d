/** Placeholder pricing plans for the office "View Pricing" tab. */

export interface Plan {
  id: string
  name: string
  price: string
  period?: string
  tagline: string
  features: string[]
  highlighted?: boolean
  cta: 'signup' | 'demo'
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    tagline: 'Explore the campus and try a few courses.',
    features: ['3 starter courses', 'Mini games in the gaming room', 'Community support'],
    cta: 'signup',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    period: '/ month',
    tagline: 'Everything a learner needs.',
    features: ['All courses & new releases', 'Progress tracking', 'Certificates', 'Priority support'],
    highlighted: true,
    cta: 'signup',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    tagline: 'Your own branded 3D campus for teams and schools.',
    features: ['Custom campus & branding', 'SSO & admin dashboard', 'Analytics', 'Dedicated success manager'],
    cta: 'demo',
  },
]
