'use client';

import { useState } from 'react';
import { User, Mail, Users, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactBalanceDialog } from './contact-balance-dialog';
import type { Contact, CurrencyCode } from '@/types';

interface ContactCardProps {
  contact: Contact;
  currency: CurrencyCode;
  onDelete?: (contactId: string) => Promise<void>;
}

export function ContactCard({ contact, currency, onDelete }: ContactCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(contact.id);
    setIsDeleting(false);
  };

  const canDelete = contact.source !== 'group_member';

  return (
    <>
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      onClick={() => setShowBalanceDialog(true)}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
        {contact.profile?.avatar_url ? (
          <img
            src={contact.profile.avatar_url}
            alt={contact.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {contact.name}
        </p>
        {contact.email && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {contact.email}
          </p>
        )}
      </div>

      {/* Source badge */}
      {contact.source === 'group_member' && contact.group && (
        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Users className="w-3 h-3" />
          {contact.group.name}
        </span>
      )}

      {/* Delete button */}
      {canDelete && onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>

    <ContactBalanceDialog
      open={showBalanceDialog}
      onOpenChange={setShowBalanceDialog}
      contact={contact}
      currency={currency}
    />
    </>
  );
}
