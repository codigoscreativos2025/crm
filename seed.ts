import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Inserting default admin user...');
    await prisma.user.upsert({
        where: { email: 'admin@admin.com' },
        update: {},
        create: {
            email: 'admin@admin.com',
            password: 'admin',
            apiKey: 'admin-seed-api-key',
            role: 'ADMIN',
            isActive: true,
            metricsEnabled: true,
        },
    });
    console.log('Seed completed. Admin user is ready.');
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
