'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users } from 'lucide-react';
import { ParticipantSelect } from './participant-select';
import { type SplitMethod, type Contact } from '@/types';
import { calculateSplits, type SplitInput, type SplitResult } from '@/lib/split-calculator';
import { getContacts } from '@/app/actions/contacts';

interface SplitToggleProps {
  amount: number;
  currency: string;
  onSplitDataChange: (data: SplitData | null) => void;
}

export interface SplitData {
  enabled: boolean;
  participants: string[];  // contact IDs
  splitMethod: SplitMethod;
  splitValues: Record<string, number>;  // for exact/percentage/shares
  preview: SplitResult[];
}

export function SplitToggle({ amount, currency, onSplitDataChange }: SplitToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Split input values (for exact, percentage, shares)
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [splitPreview, setSplitPreview] = useState<SplitResult[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);

  // Currency formatter
  const formatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    });
  }, [currency]);

  // Load contacts
  useEffect(() => {
    async function loadContacts() {
      const { contacts: data } = await getContacts();
      setContacts(data || []);
    }
    loadContacts();
  }, []);

  // Build split inputs based on method
  const buildSplitInputs = useCallback((): SplitInput[] | undefined => {
    const selectedContacts = contacts.filter(c => selectedParticipants.includes(c.id));
    const allIds = ['self', ...selectedContacts.map(c => c.id)];

    if (splitMethod === 'equal') {
      return undefined;
    }

    return allIds.map(id => {
      let value = 0;
      if (splitMethod === 'exact') {
        value = parseFloat(exactAmounts[id] || '0') || 0;
      } else if (splitMethod === 'percentage') {
        value = parseFloat(percentages[id] || '0') || 0;
      } else if (splitMethod === 'shares') {
        value = parseInt(shares[id] || '1', 10) || 1;
      }
      return { userId: id, value };
    });
  }, [splitMethod, selectedParticipants, contacts, exactAmounts, percentages, shares]);

  // Calculate split preview
  useEffect(() => {
    if (!enabled || selectedParticipants.length === 0 || amount <= 0) {
      setSplitPreview([]);
      setSplitError(null);
      return;
    }

    const selectedContacts = contacts.filter(c => selectedParticipants.includes(c.id));
    const allIds = ['self', ...selectedContacts.map(c => c.id)];

    const inputs = buildSplitInputs();
    const result = calculateSplits(splitMethod, amount, allIds, inputs);

    if (result.error) {
      setSplitError(result.error);
      setSplitPreview([]);
    } else {
      setSplitError(null);
      setSplitPreview(result.splits);
    }
  }, [enabled, amount, selectedParticipants, splitMethod, contacts, buildSplitInputs]);

  // Emit split data changes
  useEffect(() => {
    if (!enabled) {
      onSplitDataChange(null);
      return;
    }

    const splitValues: Record<string, number> = {};
    const inputs = buildSplitInputs();
    if (inputs) {
      inputs.forEach(input => {
        splitValues[input.userId] = input.value;
      });
    }

    onSplitDataChange({
      enabled,
      participants: selectedParticipants,
      splitMethod,
      splitValues,
      preview: splitPreview,
    });
  }, [enabled, selectedParticipants, splitMethod, splitPreview, buildSplitInputs, onSplitDataChange]);

  // Get contact name by ID
  const getContactName = (id: string): string => {
    if (id === 'self') return 'You';
    const contact = contacts.find(c => c.id === id);
    return contact?.name || 'Unknown';
  };

  // Handle participant selection change
  const handleParticipantsChange = (ids: string[]) => {
    setSelectedParticipants(ids);
    // Initialize default values for new participants
    ids.forEach(id => {
      if (!(id in exactAmounts)) {
        setExactAmounts(prev => ({ ...prev, [id]: '' }));
      }
      if (!(id in percentages)) {
        setPercentages(prev => ({ ...prev, [id]: '' }));
      }
      if (!(id in shares)) {
        setShares(prev => ({ ...prev, [id]: '1' }));
      }
    });
  };

  if (!enabled) {
    return (
      <div className="flex items-center justify-between py-3 px-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="split-toggle" className="cursor-pointer">
            Split this expense?
          </Label>
        </div>
        <Switch
          id="split-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
    );
  }

  const selectedContacts = contacts.filter(c => selectedParticipants.includes(c.id));

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-500" />
          <Label className="font-medium">Shared Expense</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Participant selection */}
      <ParticipantSelect
        selectedIds={selectedParticipants}
        onChange={handleParticipantsChange}
      />

      {/* Split method tabs */}
      {selectedParticipants.length > 0 && (
        <>
          <div className="space-y-2">
            <Label>Split method</Label>
            <Tabs value={splitMethod} onValueChange={(v) => setSplitMethod(v as SplitMethod)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="equal">Equal</TabsTrigger>
                <TabsTrigger value="exact">Exact</TabsTrigger>
                <TabsTrigger value="percentage">%</TabsTrigger>
                <TabsTrigger value="shares">Shares</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Split inputs (for non-equal methods) */}
          {splitMethod !== 'equal' && (
            <div className="space-y-2">
              <Label>
                {splitMethod === 'exact' && 'Amount per person'}
                {splitMethod === 'percentage' && 'Percentage per person'}
                {splitMethod === 'shares' && 'Shares per person'}
              </Label>
              <div className="space-y-2">
                {/* Self (current user) */}
                <div className="flex items-center gap-2">
                  <span className="w-24 text-sm font-medium">You</span>
                  <Input
                    type="number"
                    step={splitMethod === 'shares' ? '1' : '0.01'}
                    min="0"
                    placeholder={splitMethod === 'shares' ? '1' : '0'}
                    value={
                      splitMethod === 'exact' ? exactAmounts['self'] || '' :
                      splitMethod === 'percentage' ? percentages['self'] || '' :
                      shares['self'] || '1'
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (splitMethod === 'exact') {
                        setExactAmounts(prev => ({ ...prev, self: value }));
                      } else if (splitMethod === 'percentage') {
                        setPercentages(prev => ({ ...prev, self: value }));
                      } else {
                        setShares(prev => ({ ...prev, self: value }));
                      }
                    }}
                    className="flex-1"
                  />
                  {splitMethod === 'exact' && <span className="text-sm text-muted-foreground">{currency}</span>}
                  {splitMethod === 'percentage' && <span className="text-sm text-muted-foreground">%</span>}
                </div>

                {/* Selected contacts */}
                {selectedContacts.map(contact => (
                  <div key={contact.id} className="flex items-center gap-2">
                    <span className="w-24 text-sm font-medium truncate">{contact.name}</span>
                    <Input
                      type="number"
                      step={splitMethod === 'shares' ? '1' : '0.01'}
                      min="0"
                      placeholder={splitMethod === 'shares' ? '1' : '0'}
                      value={
                        splitMethod === 'exact' ? exactAmounts[contact.id] || '' :
                        splitMethod === 'percentage' ? percentages[contact.id] || '' :
                        shares[contact.id] || '1'
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (splitMethod === 'exact') {
                          setExactAmounts(prev => ({ ...prev, [contact.id]: value }));
                        } else if (splitMethod === 'percentage') {
                          setPercentages(prev => ({ ...prev, [contact.id]: value }));
                        } else {
                          setShares(prev => ({ ...prev, [contact.id]: value }));
                        }
                      }}
                      className="flex-1"
                    />
                    {splitMethod === 'exact' && <span className="text-sm text-muted-foreground">{currency}</span>}
                    {splitMethod === 'percentage' && <span className="text-sm text-muted-foreground">%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split error */}
          {splitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{splitError}</AlertDescription>
            </Alert>
          )}

          {/* Split preview */}
          {splitPreview.length > 0 && !splitError && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                {splitPreview.map(split => (
                  <div key={split.userId} className="flex justify-between text-sm">
                    <span className={split.userId === 'self' ? 'font-medium' : ''}>
                      {getContactName(split.userId)}
                      {split.userId !== 'self' && (
                        <span className="text-muted-foreground ml-1">(owes you)</span>
                      )}
                    </span>
                    <span className="font-medium">{formatter.format(split.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
