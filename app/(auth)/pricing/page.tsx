import Link from "next/link";
import { CheckCircleFillIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Basic",
    price: 10,
    description: "Individuals starting with legal AI assistance",
    features: [
      "Limited AI requests",
      "Basic model access",
      "Artifact generation",
    ],
    cta: "Get Basic",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 30,
    description: "Legal professionals, small practices",
    features: [
      "Everything in Basic",
      "Extended AI requests",
      "Advanced model access",
      "Agentic research",
      "Legal template library",
      "Faster document processing",
      "Document comparison",
    ],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Pro+",
    price: 50,
    description: "Teams, power users, mid-sized firms",
    features: [
      "Everything in Pro",
      "3x usage on all models",
      "Team collaboration",
      "Custom workflows",
      "Priority artifact processing",
      "Long-running agents",
    ],
    cta: "Get Pro+",
    highlighted: false,
  },
  {
    name: "Ultra",
    price: 100,
    description: "Large firms, advanced legal teams",
    features: [
      "Everything in Pro+",
      "20x usage on all models",
      "Priority access to new legal features",
      "Dedicated support",
      "Custom model fine-tuning for legal data",
      "API access",
    ],
    cta: "Get Ultra",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-bold text-4xl">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            Select the perfect plan for your legal assistance needs
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              className={`flex flex-col ${
                plan.highlighted
                  ? "scale-105 border-primary shadow-lg"
                  : "border-border"
              }`}
              key={plan.name}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary px-2 py-1 text-primary-foreground text-xs">
                      Recommended
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="font-bold text-4xl">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <CheckCircleFillIcon size={20} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href="/register">{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
