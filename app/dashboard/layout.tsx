'use client';

import Sidebar from "@/components/Sidebar";
import MobileLayoutController from "@/components/MobileLayoutController";
import CleanupScheduler from "@/components/CleanupScheduler";
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isApiDocs = pathname === '/dashboard/api-docs';

    return (
        <MobileLayoutController>
            <CleanupScheduler />
            <div className="flex h-screen">
                {!isApiDocs && <Sidebar />}
                <main className={`flex-1 overflow-hidden ${isApiDocs ? 'w-full' : ''}`}>
                    {children}
                </main>
            </div>
        </MobileLayoutController>
    );
}