'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Users, Mail, Clock, Send, Loader2 } from 'lucide-react';
import { ContactCard } from '@/components/contacts/contact-card';
import { ContactRequestCard } from '@/components/contacts/contact-request-card';
import {
  sendContactRequest,
  acceptContactRequest,
  rejectContactRequest,
  cancelContactRequest,
} from '@/app/actions/contacts';
import type { Contact, ContactRequest } from '@/types';
import { toast } from 'sonner';

interface ContactsPageClientProps {
  contacts: Contact[];
  pendingRequests: ContactRequest[];
  sentRequests: ContactRequest[];
}

export function ContactsPageClient({
  contacts,
  pendingRequests,
  sentRequests,
}: ContactsPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const approvedContacts = contacts.filter(c => c.is_approved);
  const pendingSentRequests = sentRequests.filter(r => r.status === 'pending');

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    const result = await sendContactRequest(email.trim());
    setIsSending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contact request sent!');
      setEmail('');
      router.refresh();
    }
  };

  const handleAccept = async (requestId: string) => {
    const result = await acceptContactRequest(requestId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contact request accepted!');
      router.refresh();
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectContactRequest(requestId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contact request rejected');
      router.refresh();
    }
  };

  const handleCancel = async (requestId: string) => {
    const result = await cancelContactRequest(requestId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contact request cancelled');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your contacts for expense sharing
          </p>
        </div>
      </div>

      {/* Send Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5" />
            Add Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isSending || !email.trim()}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </form>
          <p className="text-sm text-gray-500 mt-2">
            The person will receive a request in their app that they must accept before you can share expenses.
          </p>
        </CardContent>
      </Card>

      {/* Pending Requests (Received) */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-orange-500" />
              Pending Requests
              <span className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-2 py-0.5 rounded-full text-sm">
                {pendingRequests.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <ContactRequestCard
                key={request.id}
                request={request}
                type="received"
                onAccept={() => handleAccept(request.id)}
                onReject={() => handleReject(request.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sent Requests (Pending) */}
      {pendingSentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-blue-500" />
              Sent Requests
              <span className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-sm">
                {pendingSentRequests.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSentRequests.map((request) => (
              <ContactRequestCard
                key={request.id}
                request={request}
                type="sent"
                onCancel={() => handleCancel(request.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approved Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Your Contacts
            <span className="ml-auto bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full text-sm">
              {approvedContacts.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedContacts.length > 0 ? (
            <div className="space-y-3">
              {approvedContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                No contacts yet. Send a request to add your first contact!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
