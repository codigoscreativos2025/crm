'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function MobileLayoutController({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // On mobile, we only show the sidebar on the root dashboard page.
    // Anywhere else (chat, profile, funnels, api-docs), we show the main content.
    const isDashboardRoot = pathname === '/dashboard';
    const isApiDocs = pathname === '/dashboard/api-docs';
    const isAdmin = pathname === '/admin' || pathname?.startsWith('/admin');

    return (
        <div className="flex h-screen overflow-hidden bg-[#e9edef]">
            {isAdmin ? (
                // Admin page handles its own layout
                <main className="w-full h-full bg-gray-100 overflow-y-auto">
                    {children}
                </main>
            ) : (
                <>
                    <div className={`
                        h-full bg-white border-r border-gray-200
                        ${isApiDocs ? 'hidden' : isDashboardRoot ? 'w-full md:w-96' : 'hidden md:block md:w-96'}
                    `}>
                        <Sidebar />
                    </div>

                    <main className={`
                        h-full bg-[#efeae2] overflow-y-auto
                        ${isApiDocs ? 'w-full' : !isDashboardRoot ? 'w-full flex-1' : 'hidden md:flex md:flex-1'}
                    `}>
                        {children}
                    </main>
                </>
            )}
        </div>
    );
}