'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Clock } from 'lucide-react';
import { closeShift } from '@/app/actions/shift';

interface ShiftClosureModalProps {
  shiftId: string;
  userId: string;
  tenantId: string;
  expectedCash: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShiftClosureModal({
  shiftId,
  userId,
  tenantId,
  expectedCash,
  isOpen,
  onClose,
  onSuccess,
}: ShiftClosureModalProps) {
  const [actualCash, setActualCash] = useState<number>(expectedCash);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const variance = actualCash - expectedCash;
  const variancePercent =
    expectedCash > 0 ? ((variance / expectedCash) * 100).toFixed(2) : '0';

  const handleCloseShift = async () => {
    if (!confirm('Close this shift? This cannot be undone.')) return;

    setLoading(true);
    try {
      const result = await closeShift(
        shiftId,
        userId,
        actualCash,
        notes || undefined,
        tenantId
      );

      if (result.success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error closing shift:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-bold text-foreground">Close Shift</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your shift and reconcile cash
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cash Reconciliation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Cash Reconciliation</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Expected Cash</p>
                <p className="text-2xl font-bold text-foreground">
                  {expectedCash.toFixed(2)} EGP
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm text-muted-foreground block mb-2">
                  Actual Cash
                </label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                  className="w-full text-2xl font-bold bg-background border border-border rounded px-2 py-1"
                />
              </div>
            </div>

            {/* Variance */}
            <div
              className={`p-4 rounded-lg flex items-center justify-between ${
                variance > 0
                  ? 'bg-green-500/10 border border-green-500/30'
                  : variance < 0
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                {variance > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : variance < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                ) : (
                  <DollarSign className="w-5 h-5" />
                )}
                <span className="text-sm text-muted-foreground">Variance</span>
              </div>
              <div className="text-right">
                <p
                  className={`text-2xl font-bold ${
                    variance > 0
                      ? 'text-green-600'
                      : variance < 0
                      ? 'text-red-600'
                      : 'text-foreground'
                  }`}
                >
                  {variance > 0 ? '+' : ''}{variance.toFixed(2)} EGP
                </p>
                <p className="text-xs text-muted-foreground">{variancePercent}%</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="Add any notes about this shift..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCloseShift}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Closing...' : 'Close Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
