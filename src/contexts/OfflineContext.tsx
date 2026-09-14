'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CacheManager } from '@/lib/cache-manager';

interface OfflineContextType {
  isOnline: boolean;
  queueAction: (action: string, data: any) => void;
  getQueue: () => any[];
  clearQueue: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Sync queued actions
      console.log('Back online! Syncing queued actions...');
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueAction = useCallback((action: string, data: any) => {
    const queuedAction = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date(),
    };
    setQueue((prev) => [...prev, queuedAction]);
    CacheManager.set(`queue_${queuedAction.id}`, queuedAction);
  }, []);

  const getQueue = useCallback(() => queue, [queue]);

  const clearQueue = useCallback(() => {
    queue.forEach((item) => {
      CacheManager.delete(`queue_${item.id}`);
    });
    setQueue([]);
  }, [queue]);

  return (
    <OfflineContext.Provider value={{ isOnline, queueAction, getQueue, clearQueue }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
