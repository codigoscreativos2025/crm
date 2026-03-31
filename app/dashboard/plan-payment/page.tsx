'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';

const PLAN_PRICES: Record<string, number> = {
    FREELANCE: 30,
    PRO: 160,
    EMBAJADOR: 100,
};

const PLAN_NAMES: Record<string, string> = {
    FREELANCE: 'Freelance',
    PRO: 'Pivot Pro',
    EMBAJADOR: 'Embajador',
};

declare global {
    interface Window {
        paypal?: {
            Buttons: (config: any) => any;
        };
    }
}

function PlanPaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan') || 'FREELANCE';
    const [loading, setLoading] = useState(false);
    const [paid, setPaid] = useState(false);
    const [checking, setChecking] = useState(true);
    const paypalRendered = useRef(false);

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
            
            if (session.user.plan && session.user.plan !== 'FREE' && session.user.plan !== planId) {
                router.push('/dashboard');
                return;
            }
        } catch (error) {
            router.push('/login');
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        if (checking || paid || paypalRendered.current) return;
        
        // Load PayPal SDK
        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=test&currency=USD';
        script.async = true;
        script.onload = () => {
            if (window.paypal && !paypalRendered.current) {
                paypalRendered.current = true;
                window.paypal.Buttons({
                    style: {
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'paypal',
                    },
                    createOrder: (data: any, actions: any) => {
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: PLAN_PRICES[planId].toString()
                                },
                                description: `PIVOT CRM - Plan ${PLAN_NAMES[planId]} - Monthly`
                            }]
                        });
                    },
                    onApprove: async (data: any) => {
                        setLoading(true);
                        try {
                            const res = await fetch('/api/subscription/activate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    plan: planId,
                                    orderId: data.orderID 
                                })
                            });

                            if (res.ok) {
                                setPaid(true);
                            } else {
                                alert('Error al procesar el pago');
                            }
                        } catch (error) {
                            alert('Error al procesar el pago');
                        } finally {
                            setLoading(false);
                        }
                    },
                    onError: (err: any) => {
                        console.error('PayPal Error:', err);
                        alert('Error en el pago. Por favor intenta de nuevo.');
                    }
                }).render('#paypal-button-container');
            }
        };
        document.body.appendChild(script);
    }, [checking, paid, planId]);

    const handleSimulatePayment = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subscription/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan: planId,
                    orderId: 'SIMULATED_' + Date.now()
                })
            });

            if (res.ok) {
                setPaid(true);
            }
        } catch (error) {
            alert('Error al procesar');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (paid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h2>
                    <p className="text-gray-600 mb-6">
                        Tu plan <strong>{PLAN_NAMES[planId]}</strong> ha sido activado correctamente.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                        Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => router.push('/dashboard/plan-selection')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver a planes
                </button>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-8 text-white">
                        <h2 className="text-2xl font-bold mb-2">Completar Pago</h2>
                        <p className="opacity-90">Plan {PLAN_NAMES[planId]}</p>
                    </div>

                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{PLAN_NAMES[planId]}</h3>
                                <p className="text-gray-500 text-sm">Suscripción mensual</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-gray-900">${PLAN_PRICES[planId]}</span>
                                <span className="text-gray-500">/mes</span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Método de pago
                            </h4>
                            
                            <div id="paypal-button-container" className="min-h-[200px] flex items-center justify-center">
                                {loading && (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando pago...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-500">o</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleSimulatePayment}
                                disabled={loading}
                                className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Simular Pago (Demo)
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Usa este botón para probar el flujo sin PayPal real
                            </p>
                        </div>
                    </div>
                </div>

                    <p className="text-center text-gray-500 text-sm mt-6">
                    Tus datos están seguros. PayPal protege tu información financiera.
                </p>
            </div>
        </div>
    );
}

export default function PlanPaymentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <PlanPaymentContent />
        </Suspense>
    );
}