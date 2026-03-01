'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EscNavHandler({ targetRoute = '/dashboard' }: { targetRoute?: string }) {
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                router.push(targetRoute);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, targetRoute]);

    return null; // This component doesn't render anything
}
