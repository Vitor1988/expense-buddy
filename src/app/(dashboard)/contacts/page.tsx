import {
  getContacts,
  getPendingContactRequests,
  getSentContactRequests
} from '@/app/actions/contacts';
import { ContactsPageClient } from '@/components/contacts/contacts-page-client';

export default async function ContactsPage() {
  // Fetch contacts data in parallel
  const [
    { contacts },
    { requests: pendingRequests },
    { requests: sentRequests },
  ] = await Promise.all([
    getContacts(),
    getPendingContactRequests(),
    getSentContactRequests(),
  ]);

  return (
    <ContactsPageClient
      contacts={contacts}
      pendingRequests={pendingRequests}
      sentRequests={sentRequests}
    />
  );
}
