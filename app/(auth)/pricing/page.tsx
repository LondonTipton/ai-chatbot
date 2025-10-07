import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircleFillIcon } from '@/components/icons';
import Link from 'next/link';

const plans = [
  {
    name: 'Basic',
    price: 10,
    description: 'Individuals starting with legal AI assistance',
    features: [
      'Limited AI requests',
      'Basic model access',
      'Artifact generation',
    ],
    cta: 'Get Basic',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 30,
    description: 'Legal professionals, small practices',
    features: [
      'Everything in Basic',
      'Extended AI requests',
      'Advanced model access',
      'Agentic research',
      'Legal template library',
      'Faster document processing',
      'Document comparison',
    ],
    cta: 'Get Pro',
    highlighted: true,
  },
  {
    name: 'Pro+',
    price: 50,
    description: 'Teams, power users, mid-sized firms',
    features: [
      'Everything in Pro',
      '3x usage on all models',
      'Team collaboration',
      'Custom workflows',
      'Priority artifact processing',
      'Long-running agents',
    ],
    cta: 'Get Pro+',
    highlighted: false,
  },
  {
    name: 'Ultra',
    price: 100,
    description: 'Large firms, advanced legal teams',
    features: [
      'Everything in Pro+',
      '20x usage on all models',
      'Priority access to new legal features',
      'Dedicated support',
      'Custom model fine-tuning for legal data',
      'API access',
    ],
    cta: 'Get Ultra',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Select the perfect plan for your legal assistance needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${
                plan.highlighted
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.highlighted && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircleFillIcon size={20} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  asChild
                >
                  <Link href="/register">{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
