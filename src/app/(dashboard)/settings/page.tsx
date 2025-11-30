import { SettingsPageClient } from '@/components/settings/settings-page-client';
import { getProfile } from '@/app/actions/settings';
import { redirect } from 'next/navigation';

interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  email: string;
}

export default async function SettingsPage() {
  // Fetch profile on the server
  const { data: profile } = await getProfile();

  if (!profile) {
    redirect('/login');
  }

  return <SettingsPageClient profile={profile as Profile} />;
}
