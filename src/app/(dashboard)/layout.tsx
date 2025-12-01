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
      <RecurringProcessor />
      <Sidebar />
      <div className="md:ml-64">
        <Header user={user} />
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
