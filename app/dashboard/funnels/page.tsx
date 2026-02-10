import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FunnelManager from "@/components/FunnelManager";

export default async function FunnelsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    return (
        <div className="min-h-screen bg-[#f0f2f5] p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Embudos</h1>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-500 mb-6">Administra tus embudos de venta y personaliza las etapas para organizar mejor tus contactos.</p>
                    <FunnelManager />
                </div>
            </div>
        </div>
    );
}
