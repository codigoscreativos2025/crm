import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import prisma from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) }
    });

    if (!user) redirect('/login');

    return (
        <div className="min-h-screen bg-[#f0f2f5] p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#008069] p-6 text-white flex items-center">
                    <Link href="/dashboard" className="mr-4 hover:bg-white/20 p-2 rounded-full transition">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-semibold">Perfil de Usuario</h1>
                </div>

                <div className="p-8">
                    <div className="flex items-center mb-8 pb-8 border-b border-gray-100">
                        <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mr-6">
                            <User className="h-10 w-10 text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-gray-800">{user.email}</h2>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                            <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-100 p-1 rounded inline-block">
                                API Key: {user.apiKey}
                            </p>
                            {/* @ts-ignore */}
                            {session.user.role === 'ADMIN' && (
                                <Link href="/admin" className="ml-4 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">
                                    Panel Admin
                                </Link>
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-medium text-gray-700 mb-4">Cambiar Contraseña</h3>
                    <ProfileForm />
                </div>
            </div>
        </div>
    );
}
