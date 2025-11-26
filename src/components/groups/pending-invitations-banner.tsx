'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMyPendingInvitations, acceptInvitation, declineInvitation } from '@/app/actions/groups';

interface PendingInvite {
  id: string;
  token: string;
  group: { id: string; name: string };
  inviter: { full_name: string | null };
  created_at: string;
}

export function PendingInvitationsBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    const { data } = await getMyPendingInvitations();
    if (data) {
      setInvites(data);
    }
    setLoading(false);
  };

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const result = await acceptInvitation(invite.token);

    if (result.error) {
      toast.error(result.error);
      setProcessingId(null);
      return;
    }

    toast.success('Invitation accepted');
    // Remove from list and redirect
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setProcessingId(null);

    if (result.groupId) {
      router.push(`/groups/${result.groupId}`);
    }
  };

  const handleDecline = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const result = await declineInvitation(invite.token);

    if (result.error) {
      toast.error(result.error);
      setProcessingId(null);
      return;
    }

    toast.success('Invitation declined');
    // Remove from list
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setProcessingId(null);
  };

  if (loading || invites.length === 0) {
    return null;
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-medium text-emerald-700 dark:text-emerald-300">
            Pending Invitations ({invites.length})
          </h3>
        </div>
        <div className="space-y-2">
          {invites.map((invite) => {
            const isProcessing = processingId === invite.id;

            return (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invite.group.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Invited by {invite.inviter.full_name || 'a group member'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDecline(invite)}
                    disabled={isProcessing}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={isProcessing}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Join
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
