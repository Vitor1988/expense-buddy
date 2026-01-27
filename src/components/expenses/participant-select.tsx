'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, X, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type Contact } from '@/types';
import { getApprovedContacts } from '@/app/actions/contacts';
import { useToast } from '@/hooks/use-toast';

interface ParticipantSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ParticipantSelect({ selectedIds, onChange }: ParticipantSelectProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { contacts: data, error } = await getApprovedContacts();
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      setContacts(data);
    }
    setLoading(false);
  }

  function toggleContact(contactId: string) {
    if (selectedIds.includes(contactId)) {
      onChange(selectedIds.filter(id => id !== contactId));
    } else {
      onChange([...selectedIds, contactId]);
    }
  }

  const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));

  return (
    <div className="space-y-3">
      <Label>Split with</Label>

      {/* Selected contacts badges */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map(contact => (
            <Badge
              key={contact.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {contact.name}
              {contact.source === 'group_member' && contact.group && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({contact.group.name})
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleContact(contact.id)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Contact selection list */}
      <div className="border rounded-md max-h-48 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No contacts yet</p>
            <p className="text-xs">Add contacts to split expenses</p>
          </div>
        ) : (
          <div className="divide-y">
            {contacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggleContact(contact.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedIds.includes(contact.id)
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {selectedIds.includes(contact.id) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span className="font-medium">{contact.name}</span>
                </div>
                {contact.source === 'group_member' && contact.group && (
                  <span className="text-xs text-muted-foreground">
                    {contact.group.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Link to add contacts */}
      <Link href="/contacts">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add contacts
        </Button>
      </Link>
    </div>
  );
}
