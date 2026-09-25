import { db } from './db.js';

async function main() {
    const roles = ['ADMIN', 'USER'] as const;

    for (const name of roles) {
        await db.orm.public.Role.upsert({
            create: { name },
            update: {},
            conflictOn: { name },
        });
    }

    console.log('Seeded roles: ADMIN, USER');
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.close();
    });
