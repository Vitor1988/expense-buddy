'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { type Contact } from '@/types';
import { getContacts, createContact } from '@/app/actions/contacts';
import { useToast } from '@/hooks/use-toast';

interface ParticipantSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ParticipantSelect({ selectedIds, onChange }: ParticipantSelectProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { contacts: data, error } = await getContacts();
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

  async function handleAddContact() {
    if (!newContactName.trim()) return;

    setAdding(true);
    const formData = new FormData();
    formData.set('name', newContactName.trim());
    if (newContactEmail.trim()) {
      formData.set('email', newContactEmail.trim());
    }

    const result = await createContact(formData);
    setAdding(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.contact) {
      // Add new contact to list and select it
      setContacts(prev => [...prev, result.contact!]);
      onChange([...selectedIds, result.contact.id]);
      setShowAddDialog(false);
      setNewContactName('');
      setNewContactEmail('');
      toast({
        title: 'Contact added',
        description: `${result.contact.name} was added to your contacts`,
      });
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

      {/* Add new contact button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add new contact
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                placeholder="e.g., John Doe"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email (optional)</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="e.g., john@example.com"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleAddContact}
              disabled={adding || !newContactName.trim()}
            >
              {adding ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
