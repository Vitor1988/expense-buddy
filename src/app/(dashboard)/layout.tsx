import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { RecurringProcessor } from '@/components/layout/recurring-processor';
import { PullToRefresh } from '@/components/layout/pull-to-refresh';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-gray-900 dark:focus:bg-gray-800 dark:focus:text-white"
      >
        Skip to main content
      </a>
      <RecurringProcessor />
      <Sidebar />
      <div className="md:ml-64">
        <PullToRefresh>
          <Header user={user} />
          <main id="main-content" className="p-4 md:p-6 pb-24 md:pb-6">
            {children}
          </main>
        </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
}
