import { createClient } from '@/lib/supabase/server';
import { getGroups } from '@/app/actions/groups';
import { GroupsPageClient } from '@/components/groups/groups-page-client';

export default async function GroupsPage() {
  const supabase = await createClient();

  // Fetch user and groups in parallel
  const [{ data: { user } }, { data: groups }] = await Promise.all([
    supabase.auth.getUser(),
    getGroups(),
  ]);

  // Get currency (this is a quick query, fine to do after user is known)
  let currency = 'USD';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();
    if (profile?.currency) {
      currency = profile.currency;
    }
  }

  return <GroupsPageClient groups={groups || []} currency={currency} />;
}
