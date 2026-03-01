import Sidebar from "@/components/Sidebar";

import MobileLayoutController from "@/components/MobileLayoutController";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MobileLayoutController>
            {children}
        </MobileLayoutController>
    );
}
