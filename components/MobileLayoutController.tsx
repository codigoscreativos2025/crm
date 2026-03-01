'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function MobileLayoutController({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // On mobile, we only show the sidebar on the root dashboard page.
    // Anywhere else (chat, profile, funnels), we show the main content.
    const isDashboardRoot = pathname === '/dashboard';

    return (
        <div className="flex h-screen overflow-hidden bg-[#e9edef]">
            {/* 
        Sidebar Logic:
        - Desktop (md+): Always visible (w-96)
        - Mobile: Visible ONLY if on root dashboard
      */}
            <div className={`
        h-full bg-white border-r border-gray-200
        ${isDashboardRoot ? 'w-full md:w-96' : 'hidden md:block md:w-96'}
      `}>
                <Sidebar />
            </div>

            {/* 
        Main Content Logic:
        - Desktop (md+): Always visible (flex-1)
        - Mobile: Visible ONLY if NOT on root dashboard
      */}
            <main className={`
        h-full bg-[#efeae2] overflow-y-auto
        ${!isDashboardRoot ? 'w-full flex-1' : 'hidden md:flex md:flex-1'}
      `}>
                {children}
            </main>
        </div>

    );
}
