'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Check, X, LogIn } from 'lucide-react';
import { getInvitationByToken, acceptInvitation, declineInvitation } from '@/app/actions/groups';

interface InvitationData {
  id: string;
  group_id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  group: { name: string; description: string | null };
  inviter: { full_name: string | null };
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    setLoading(true);
    const { data, error } = await getInvitationByToken(token);
    if (error) {
      setError(error);
    } else {
      setInvitation(data);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    const result = await acceptInvitation(token);

    if (result.requiresAuth) {
      setRequiresAuth(true);
      setAccepting(false);
      return;
    }

    if (result.error) {
      setError(result.error);
      setAccepting(false);
      return;
    }

    if (result.groupId) {
      router.push(`/groups/${result.groupId}`);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    const result = await declineInvitation(token);

    if (result.error) {
      setError(result.error);
      setDeclining(false);
      return;
    }

    router.push('/groups');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/groups">
              <Button variant="outline">Go to Groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in or create an account to join{' '}
              <span className="font-medium">{invitation?.group.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/login?redirect=/invite/${token}`} className="block">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Button>
            </Link>
            <Link href={`/register?redirect=/invite/${token}`} className="block">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-xl">You&apos;re Invited!</CardTitle>
          <CardDescription className="text-base">
            {invitation?.inviter.full_name || 'Someone'} invited you to join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {invitation?.group.name}
            </h3>
            {invitation?.group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {invitation.group.description}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={declining || accepting}
              className="flex-1"
            >
              {declining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept & Join
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            This invitation expires on{' '}
            {invitation?.expires_at
              ? new Date(invitation.expires_at).toLocaleDateString()
              : 'soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
