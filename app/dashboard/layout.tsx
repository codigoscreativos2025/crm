import Sidebar from "@/components/Sidebar";
import MobileLayoutController from "@/components/MobileLayoutController";
import CleanupScheduler from "@/components/CleanupScheduler";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MobileLayoutController>
            <CleanupScheduler />
            {children}
        </MobileLayoutController>
    );
}
