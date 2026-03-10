import { useEffect, useState, useCallback, useRef } from 'react';
import { getPendingSales, removePendingSale, getPendingSalesCount } from '@/lib/offline-db';
import axios from 'axios';

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncingRef = useRef(false);

    // Track online/offline state
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // Refresh pending count
    const refreshPendingCount = useCallback(async () => {
        try {
            const count = await getPendingSalesCount();
            setPendingCount(count);
        } catch {
            // IndexedDB unavailable
        }
    }, []);

    // Sync pending sales to server
    const syncPendingSales = useCallback(async () => {
        if (syncingRef.current || !navigator.onLine) return;

        syncingRef.current = true;
        setIsSyncing(true);

        try {
            const pending = await getPendingSales();

            for (const sale of pending) {
                try {
                    const { offline_id, created_at: _createdAt, synced: _synced, ...saleData } = sale;
                    await axios.post('/sales', saleData);
                    await removePendingSale(offline_id as number);
                } catch {
                    // Stop syncing on first failure (server may be down)
                    break;
                }
            }
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
            await refreshPendingCount();
        }
    }, [refreshPendingCount]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && pendingCount > 0) {
            syncPendingSales();
        }
    }, [isOnline, pendingCount, syncPendingSales]);

    // Listen for service worker sync messages
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'SYNC_OFFLINE_SALES') {
                syncPendingSales();
            }
        };
        navigator.serviceWorker?.addEventListener('message', handler);
        return () => navigator.serviceWorker?.removeEventListener('message', handler);
    }, [syncPendingSales]);

    // Initial pending count
    useEffect(() => {
        refreshPendingCount();
    }, [refreshPendingCount]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncPendingSales,
        refreshPendingCount,
    };
}
