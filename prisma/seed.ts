import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Crear Usuario Principal (ADMIN)
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: { role: 'ADMIN' },
        create: {
            email: 'test@example.com',
            password: 'password123',
            apiKey: 'test-api-key-123',
            role: 'ADMIN',
        },
    })

    console.log('Usuario Admin creado:', user.email)

    // 2. Crear Embudo por Defecto (Si no existe)
    const funnel = await prisma.funnel.create({
        data: {
            name: "Ventas Principal",
            userId: user.id,
            stages: {
                create: [
                    { name: "Nuevo Lead", order: 1 },
                    { name: "Contactado", order: 2 },
                    { name: "En Negociación", order: 3 },
                    { name: "Cerrado", order: 4 },
                ]
            }
        },
        include: { stages: true }
    })

    const stages = funnel.stages

    // 3. Crear Contactos de Prueba
    const contactsData = [
        { phone: '+525512345678', name: 'Juan Pérez', stageIndex: 0 },
        { phone: '+573009876543', name: 'Maria Rodriguez', stageIndex: 1 },
        { phone: '+34600112233', name: 'Carlos Tech', stageIndex: 2 },
    ]

    for (const c of contactsData) {
        const contact = await prisma.contact.upsert({
            where: {
                userId_phone: {
                    userId: user.id,
                    phone: c.phone
                }
            },
            update: {
                stageId: stages[c.stageIndex].id
            },
            create: {
                phone: c.phone,
                name: c.name,
                userId: user.id,
                stageId: stages[c.stageIndex].id
            }
        })

        // 4. Crear Mensajes para cada contacto
        await prisma.message.createMany({
            data: [
                {
                    body: `Hola, estoy interesado en sus servicios. Soy ${c.name}.`,
                    direction: 'inbound',
                    status: 'received',
                    contactId: contact.id,
                    timestamp: new Date(Date.now() - 10000000)
                },
                {
                    body: `Hola ${c.name}, claro que sí. ¿En qué podemos ayudarte?`,
                    direction: 'outbound',
                    status: 'read',
                    contactId: contact.id,
                    timestamp: new Date(Date.now() - 9000000)
                },
                {
                    body: 'Me gustaría saber precios del plan premium.',
                    direction: 'inbound',
                    status: 'received',
                    contactId: contact.id,
                    timestamp: new Date(Date.now() - 10000), // Reciente
                }
            ]
        })

        console.log(`Contacto creado: ${c.name} con mensajes.`)
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
