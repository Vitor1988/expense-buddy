import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  PieChart,
  Wallet,
  TrendingUp,
  Users,
  Smartphone,
} from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Expense Buddy
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Take Control of Your{' '}
            <span className="text-emerald-500">Finances</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
            Track expenses, set budgets, and gain insights into your spending
            habits. Your personal finance companion that works on any device.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
              >
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<PieChart className="w-8 h-8 text-emerald-500" />}
            title="Visual Reports"
            description="Beautiful charts and graphs to visualize your spending patterns and trends."
          />
          <FeatureCard
            icon={<Wallet className="w-8 h-8 text-emerald-500" />}
            title="Budget Tracking"
            description="Set budgets for categories and get alerts when you're approaching limits."
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 text-emerald-500" />}
            title="Spending Insights"
            description="Understand where your money goes with detailed analytics and reports."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-emerald-500" />}
            title="Split Expenses"
            description="Share expenses with friends and family. Track who owes what."
          />
          <FeatureCard
            icon={<Smartphone className="w-8 h-8 text-emerald-500" />}
            title="Works Everywhere"
            description="Install as an app on your phone. Works offline too!"
          />
          <FeatureCard
            icon={
              <svg
                className="w-8 h-8 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            }
            title="Dark Mode"
            description="Easy on the eyes with automatic dark mode support."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Expense Buddy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
