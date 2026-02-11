
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Users, MessageSquare, Database } from "lucide-react";
import AdminContactList from "@/components/AdminContactList";

export default async function AdminPage() {
    const session = await auth();

    // Protect Route
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    // Fetch Stats
    const usersCount = await prisma.user.count();
    const contactsCount = await prisma.contact.count();
    const messagesCount = await prisma.message.count();

    // Fetch Contacts with details for the list
    const contacts = await prisma.contact.findMany({
        include: {
            user: { select: { email: true } },
            stage: { include: { funnel: { select: { name: true } } } },
            _count: { select: { messages: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 1000 // Limit for performance
    });

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Super Administrador</h1>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                            <Users className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Usuarios Totales</p>
                            <h3 className="text-2xl font-bold text-gray-800">{usersCount}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                            <Database className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Leads Totales</p>
                            <h3 className="text-2xl font-bold text-gray-800">{contactsCount}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                            <MessageSquare className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Mensajes Totales</p>
                            <h3 className="text-2xl font-bold text-gray-800">{messagesCount}</h3>
                        </div>
                    </div>
                </div>

                {/* Contact List with Filters & Chat View */}
                <AdminContactList initialContacts={contacts} />
            </div>
        </div>
    );
}

