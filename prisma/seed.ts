import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.student.upsert({
    where: { email: "jayden@example.com" },
    update: {},
    create: {
      name: "Jayden",
      email: "jayden@example.com",
      year: "Year 5",
      xp: 0,
    },
  });
}

main()
  .then(() => {
    console.log("✅ Student seeded");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
