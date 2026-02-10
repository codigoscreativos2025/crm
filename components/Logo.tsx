import React from 'react';

export default function Logo({ className = "h-16 w-auto" }: { className?: string }) {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* Icono de Pivot (Aproximación SVG) */}
            <svg
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-2"
            >
                <path
                    d="M40 100 C 40 60, 80 40, 120 40"
                    stroke="#0066CC"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="opacity-80"
                />
                <path
                    d="M50 110 Q 90 90 150 40"
                    stroke="#0066CC"
                    strokeWidth="12"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                />
                <circle cx="110" cy="110" r="12" fill="#0066CC" />
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#0066CC" />
                    </marker>
                </defs>
            </svg>
            {/* Texto */}
            <h1 className="text-4xl font-bold text-[#003366] tracking-tight">Pivot</h1>
            <p className="text-sm text-gray-500 tracking-wider">Soluciones Inteligentes</p>
        </div>
    );
}
