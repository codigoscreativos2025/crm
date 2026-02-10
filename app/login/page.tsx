'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    useEffect(() => {
        if (registered) {
            setError('Cuenta creada exitosamente. Por favor inicia sesión.');
        }
    }, [registered]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            setError('Credenciales inválidas');
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f2f5]">
            <div className="mb-8">
                <Logo />
            </div>

            <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-xl font-semibold text-gray-800">Iniciar Sesión</h2>

                {error && (
                    <div className={`mb-4 rounded p-3 text-sm bg-red-100 text-red-600`}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            placeholder="usuario@ejemplo.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-[#003366] py-2 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
                <div className="mt-4 text-center text-xs text-gray-500">
                    <p>¿No tienes cuenta? <Link href="/register" className="text-blue-600 hover:underline">Regístrate</Link></p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <LoginForm />
        </Suspense>
    )
}
