'use client';

import { useEffect, useRef } from 'react';

export default function CleanupScheduler() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const initScheduler = async () => {
            try {
                await fetch('/api/maintenance/cleanup', { method: 'POST' });
            } catch (e) {
                console.log('[CleanupScheduler] Running in background');
            }
        };

        initScheduler();
    }, []);

    return null;
}
