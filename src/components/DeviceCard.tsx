'use client';

import React, { useState } from 'react';
import { Device, Session } from '@prisma/client';
import { Play, MoreVertical, Settings } from 'lucide-react';
import { startSession } from '@/app/actions/session';
import { SessionModal } from './SessionModal';

interface DeviceCardProps {
  device: Device & { sessions: Session[] };
  tenantId: string;
  userId: string;
  onSessionStart: () => void;
  inventory: any[];
}

export function DeviceCard({
  device,
  tenantId,
  userId,
  onSessionStart,
  inventory,
}: DeviceCardProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isMulti, setIsMulti] = useState(false);

  const activeSession = device.sessions.find((s) => s.isActive);

  const handleStartSession = async (multi: boolean) => {
    setLoading(true);
    try {
      const result = await startSession(
        device.id,
        userId,
        tenantId,
        multi
      );

      if (result.success) {
        setIsMulti(multi);
        onSessionStart();
      }
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!activeSession) return 'border-border';
    return 'border-green-500 bg-green-500/5';
  };

  const getStatusBadge = () => {
    if (!activeSession) return 'Available';
    return 'Active';
  };

  return (
    <>
      <div
        className={`border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
          getStatusColor()
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">Device {device.number}</h3>
            <p className="text-sm text-muted-foreground">{device.type}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              activeSession
                ? 'bg-green-500/20 text-green-700'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {getStatusBadge()}
          </span>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Single</p>
            <p className="font-bold">{device.hourlyRateSingle} EGP/hr</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Multi</p>
            <p className="font-bold">{device.hourlyRateMulti} EGP/hr</p>
          </div>
        </div>

        {/* Active Session Info */}
        {activeSession && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Active Session</p>
            <p className="font-mono text-sm">
              {Math.floor(
                (Date.now() - new Date(activeSession.startTime).getTime()) / 1000 / 60
              )}
              m
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!activeSession ? (
            <>
              <button
                onClick={() => handleStartSession(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Single
              </button>
              <button
                onClick={() => handleStartSession(true)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Multi
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              Manage Session
            </button>
          )}
        </div>
      </div>

      {/* Session Modal */}
      {activeSession && (
        <SessionModal
          session={activeSession as any}
          inventory={inventory}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSessionEnd={onSessionStart}
        />
      )}
    </>
  );
}
