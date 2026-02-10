'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function MobileLayoutController({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Check if we are in a chat conversation (e.g., /dashboard/chat/123)
    const isChatOpen = pathname.includes('/dashboard/chat/');

    return (
        <div className="flex h-screen overflow-hidden bg-[#e9edef]">
            {/* 
        Sidebar Logic:
        - Desktop (md+): Always visible (w-96)
        - Mobile: Visible ONLY if NO chat is open (w-full)
      */}
            <div className={`
        h-full bg-white border-r border-gray-200
        ${isChatOpen ? 'hidden md:block md:w-96' : 'w-full md:w-96'}
      `}>
                <Sidebar />
            </div>

            {/* 
        Main Content (Chat) Logic:
        - Desktop (md+): Always visible (flex-1)
        - Mobile: Visible ONLY if chat IS open (w-full)
      */}
            <main className={`
        h-full bg-[#efeae2]
        ${isChatOpen ? 'w-full flex-1' : 'hidden md:flex md:flex-1'}
      `}>
                {children}
            </main>
        </div>
    );
}
