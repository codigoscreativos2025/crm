import prisma from "@/lib/prisma";

/**
 * Calcula la deuda actual de un residente y su estado de solvencia.
 * Aplica abonos anticipados a las deudas más antiguas.
 */
export async function calculateResidentSolvency(residentId: number, condominiumId: number) {
    // Obtener el residente con su advanceCredit
    const resident = await prisma.resident.findUnique({
        where: { id: residentId }
    });

    if (!resident) {
        return { totalDebt: 0, isSolvent: true, advanceCredit: 0 };
    }

    // Obtener todas las deudas pendientes del residente
    const debts = await prisma.residentDebt.findMany({
        where: { 
            residentId,
            isPaid: false
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    // Obtener todos los ingresos conciliados de la tabla Transaction
    const transactions = await prisma.transaction.findMany({
        where: {
            residentId,
            type: 'INCOME',
            status: 'RECONCILED'
        },
        orderBy: [{ date: 'asc' }]
    });

    let advanceCredit = resident.advanceCredit || 0;

    // Procesar transacciones
    for (const transaction of transactions) {
        if (transaction.month === null || transaction.year === null) {
            //Abono general, se suma al advanceCredit
            advanceCredit += transaction.amount;
        } else {
            //Pago específico de un mes
            const debt = debts.find(d => d.month === transaction.month && d.year === transaction.year);
            if (debt) {
                debt.amountPaid += transaction.amount;
                if (debt.amountPaid >= debt.amount) {
                    debt.isPaid = true;
                }
            }
        }
    }

    // Aplicar advanceCredit a las deudas más antiguas
    let remainingCredit = advanceCredit;
    for (const debt of debts) {
        if (debt.isPaid) continue;
        
        const pendingAmount = debt.amount - debt.amountPaid;
        if (remainingCredit >= pendingAmount) {
            debt.amountPaid += pendingAmount;
            debt.isPaid = true;
            remainingCredit -= pendingAmount;
        } else if (remainingCredit > 0) {
            debt.amountPaid += remainingCredit;
            remainingCredit = 0;
        }
    }

    // Guardar cambios en las deudas
    for (const debt of debts) {
        await prisma.residentDebt.update({
            where: { id: debt.id },
            data: {
                amountPaid: debt.amountPaid,
                isPaid: debt.isPaid
            }
        });
    }

    // Calcular total de deuda pendiente
    const totalDebt = debts
        .filter(d => !d.isPaid)
        .reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

    // Actualizar advanceCredit del residente
    await prisma.resident.update({
        where: { id: residentId },
        data: { advanceCredit: remainingCredit }
    });

    // Determinar estado
    const isSolvent = totalDebt <= 0;

    // Actualizar estado del residente
    await prisma.resident.update({
        where: { id: residentId },
        data: { status: isSolvent ? 'SOLVENTE' : 'INSOLVENTE' }
    });

    return {
        totalDebt,
        isSolvent,
        advanceCredit: remainingCredit,
        debts: debts.map(d => ({
            month: d.month,
            year: d.year,
            amount: d.amount,
            amountPaid: d.amountPaid,
            pending: d.amount - d.amountPaid,
            isPaid: d.isPaid
        }))
    };
}

/**
 * Recalcula la solvencia de todos los residentes de un condominio
 */
export async function recalculateAllSolvency(condominiumId: number) {
    const residents = await prisma.resident.findMany({
        where: { condominiumId }
    });

    const results = [];
    for (const resident of residents) {
        const result = await calculateResidentSolvency(resident.id, condominiumId);
        results.push({
            residentId: resident.id,
            name: resident.name,
            ...result
        });
    }

    return results;
}

/**
 * Crea las deudas de todos los residentes cuando se genera una factura mensual
 */
export async function createMonthlyDebts(condominiumId: number, month: number, year: number, amountPerResident: number, invoiceId: number) {
    const residents = await prisma.resident.findMany({
        where: { condominiumId }
    });

    const createdDebts = [];

    for (const resident of residents) {
        // Verificar si ya existe deuda para ese mes
        const existingDebt = await prisma.residentDebt.findUnique({
            where: {
                residentId_month_year: {
                    residentId: resident.id,
                    month,
                    year
                }
            }
        });

        if (!existingDebt) {
            const debt = await prisma.residentDebt.create({
                data: {
                    residentId: resident.id,
                    condominiumId,
                    month,
                    year,
                    amount: amountPerResident,
                    invoiceId,
                    isPaid: false
                }
            });
            createdDebts.push(debt);
        }

        // Cambiar a insolvente hasta que se recalcule
        await prisma.resident.update({
            where: { id: resident.id },
            data: { status: 'INSOLVENTE' }
        });
    }

    return createdDebts;
}
