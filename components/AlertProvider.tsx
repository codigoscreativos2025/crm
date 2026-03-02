'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertType = 'info' | 'success' | 'error' | 'warning';

interface AlertContextProps {
    showAlert: (message: string, type?: AlertType) => void;
    showConfirm: (message: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alertMessage, setAlertMessage] = useState<{ text: string, type: AlertType } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ message: string, resolve: (val: boolean) => void } | null>(null);

    const showAlert = (message: string, type: AlertType = 'info') => {
        setAlertMessage({ text: message, type });
        setTimeout(() => {
            setAlertMessage(null); // Auto close alert
        }, 3000);
    };

    const showConfirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmDialog({ message, resolve });
        });
    };

    const handleConfirm = (value: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {/* Alert Modal */}
            {alertMessage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full mx-4 border-t-4 border-[#003366]">
                        <p className="text-gray-800 text-lg">{alertMessage.text}</p>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full mx-4">
                        <p className="text-gray-800 text-lg mb-6">{confirmDialog.message}</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => handleConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium transition shadow-sm"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};
