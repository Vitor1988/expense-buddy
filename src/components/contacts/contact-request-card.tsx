'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, Check, X, Loader2 } from 'lucide-react';
import type { ContactRequest } from '@/types';

interface ContactRequestCardProps {
  request: ContactRequest;
  type: 'received' | 'sent';
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onCancel?: () => Promise<void>;
}

export function ContactRequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
}: ContactRequestCardProps) {
  const [isLoading, setIsLoading] = useState<'accept' | 'reject' | 'cancel' | null>(null);

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsLoading('accept');
    await onAccept();
    setIsLoading(null);
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsLoading('reject');
    await onReject();
    setIsLoading(null);
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsLoading('cancel');
    await onCancel();
    setIsLoading(null);
  };

  // For received requests, show who sent it
  // For sent requests, show who we sent it to
  const displayName = type === 'received'
    ? (request.from_user as { full_name?: string | null })?.full_name || 'Unknown User'
    : request.to_email;

  const avatarUrl = type === 'received'
    ? (request.from_user as { avatar_url?: string | null })?.avatar_url
    : (request.to_user as { avatar_url?: string | null })?.avatar_url;

  // Format time
  const timeAgo = getTimeAgo(new Date(request.created_at));

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {type === 'received' ? 'wants to add you as a contact' : `Pending - ${timeAgo}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {type === 'received' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isLoading !== null}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {isLoading === 'reject' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={isLoading !== null}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isLoading === 'accept' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </>
              )}
            </Button>
          </>
        )}

        {type === 'sent' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading !== null}
          >
            {isLoading === 'cancel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Cancel'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
