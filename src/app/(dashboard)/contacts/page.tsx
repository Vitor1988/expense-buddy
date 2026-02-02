import {
  getContacts,
  getPendingContactRequests,
  getSentContactRequests
} from '@/app/actions/contacts';
import { getProfile } from '@/app/actions/settings';
import { ContactsPageClient } from '@/components/contacts/contacts-page-client';
import type { CurrencyCode } from '@/types';

export default async function ContactsPage() {
  // Fetch contacts data in parallel
  const [
    { contacts },
    { requests: pendingRequests },
    { requests: sentRequests },
    { data: profile },
  ] = await Promise.all([
    getContacts(),
    getPendingContactRequests(),
    getSentContactRequests(),
    getProfile(),
  ]);

  const currency = (profile?.currency || 'EUR') as CurrencyCode;

  return (
    <ContactsPageClient
      contacts={contacts}
      pendingRequests={pendingRequests}
      sentRequests={sentRequests}
      currency={currency}
    />
  );
}
