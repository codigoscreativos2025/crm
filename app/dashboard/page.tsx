import Logo from "@/components/Logo";

export default function DashboardPage() {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center border-b-8 border-[#0066CC] bg-[#f0f2f5] text-center">
            <div className="mb-6 p-6">
                <Logo className="scale-150" />
            </div>
            <h1 className="mt-4 text-3xl font-light text-gray-700">PIVOT CRM</h1>
            <p className="mt-2 text-sm text-gray-500">
                Gestiona tus leads y automatizaciones de forma inteligente.
            </p>
        </div>
    );
}
