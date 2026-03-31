'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Zap, Users, CreditCard } from 'lucide-react';

interface PlanInfo {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    icon: React.ReactNode;
    color: string;
}

const PLANS: PlanInfo[] = [
    {
        id: 'FREELANCE',
        name: 'Freelance',
        price: 30,
        description: 'Perfecto para desarrolladores independientes',
        icon: <Zap className="w-8 h-8" />,
        color: 'from-blue-500 to-cyan-500',
        features: [
            'Dashboard completo',
            'Configuración del CRM',
            'Documentación API',
            'Soporte por email',
            '1 usuario',
        ]
    },
    {
        id: 'PRO',
        name: 'Pivot Pro',
        price: 160,
        description: 'Para empresas que necesitan más poder',
        icon: <Crown className="w-8 h-8" />,
        color: 'from-purple-500 to-pink-500',
        features: [
            'Todo lo de Freelance',
            'Gestión de Condominios',
            'CRM Completo',
            'Reportes financieros',
            '5 usuarios',
            'Soporte prioritario',
        ]
    },
    {
        id: 'EMBAJADOR',
        name: 'Embajador',
        price: 100,
        description: 'Para quienes quieren ser intermediarios',
        icon: <Users className="w-8 h-8" />,
        color: 'from-amber-500 to-orange-500',
        features: [
            'Todo lo de Pro',
            'Gestión de multi-usuarios',
            'Integración WhatsApp',
            'White-label',
            'Usuarios ilimitados',
            'Soporte dedicado',
        ]
    },
];

export default function PlanSelectionPage() {
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/session');
            const session = await res.json();
            
            if (!session?.user?.id) {
                router.push('/login');
                return;
            }
            
            if (session.user.plan && session.user.plan !== 'FREE') {
                router.push('/dashboard');
                return;
            }
        } catch (error) {
            router.push('/login');
        } finally {
            setChecking(false);
        }
    };

    const handleSelectPlan = async (planId: string) => {
        setSelectedPlan(planId);
        
        try {
            setLoading(planId);

            const res = await fetch('/api/subscription/select-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });

            if (res.ok) {
                router.push(`/dashboard/plan-payment?plan=${planId}`);
            } else {
                alert('Error al seleccionar plan');
                setSelectedPlan(null);
            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar');
        } finally {
            setLoading(null);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Elige tu Plan
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Selecciona el plan que mejor se adapte a tus necesidades
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105 ${
                                selectedPlan === plan.id ? 'ring-4 ring-green-500' : ''
                            }`}
                        >
                            <div className={`h-32 bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                                <div className="text-white">
                                    {plan.icon}
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                    {plan.name}
                                </h3>
                                <p className="text-gray-500 text-center text-sm mb-6">
                                    {plan.description}
                                </p>
                                
                                <div className="text-center mb-8">
                                    <span className="text-4xl font-bold text-gray-900">
                                        ${plan.price}
                                    </span>
                                    <span className="text-gray-500">/mes</span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <span className="text-gray-700 text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={loading === plan.id}
                                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                                        loading === plan.id
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                                    }`}
                                >
                                    {loading === plan.id ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" />
                                            Pagar con PayPal
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm">
                        ¿Tienes preguntas?{' '}
                        <a href="mailto:soporte@pivotsoluciones.com" className="text-blue-400 hover:underline">
                            Contáctanos
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}