import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // 1. ROLES
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const receptionistRole = await prisma.role.upsert({
    where: { name: "RECEPTIONIST" },
    update: {},
    create: { name: "RECEPTIONIST" },
  });

  console.log("✅ Roles creados");

  // 2. BENEFICIOS. El tipo ya no es único: admite varios beneficios personalizados.
  for (const benefit of [
    { type: "FOUNDER" as const, name: "Socio Fundador", description: "10% de descuento en Full Pass para socios fundadores", discountPercentage: 10, onlyFullPass: true, active: true },
    { type: "LIFA" as const, name: "Convenio LIFA", description: "10% de descuento en Full Pass para empleados y grupo familiar de LIFA", discountPercentage: 10, onlyFullPass: true, active: true },
  ]) {
    const existing = await prisma.benefit.findFirst({ where: { type: benefit.type }, orderBy: { createdAt: "asc" } });
    if (existing) await prisma.benefit.update({ where: { id: existing.id }, data: benefit });
    else await prisma.benefit.create({ data: benefit });
  }

  console.log("✅ Beneficios creados");

  // 3. PLANES - Usando variables de entorno
  const plans = [
    {
      name: "2 veces por semana",
      description: "Plan de entrenamiento dos veces por semana",
      price: parseFloat(process.env.PLAN_2VECES_PRICE || "0"),
    },
    {
      name: "3 veces por semana",
      description: "Plan de entrenamiento tres veces por semana",
      price: parseFloat(process.env.PLAN_3VECES_PRICE || "0"),
    },
    {
      name: "Full Pass",
      description: "Acceso completo al gimnasio",
      price: parseFloat(process.env.PLAN_FULL_PRICE || "0"),
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        price: plan.price,
      },
      create: plan,
    });
  }

  console.log("✅ Planes creados");

  // 4. CATEGORÍAS FINANCIERAS
  const incomeCategories = ["BEBIDAS", "MERCHANDISING", "OTROS"];

  for (const name of incomeCategories) {
    await prisma.financialCategory.upsert({
      where: {
        name_type: {
          name,
          type: "INCOME",
        },
      },
      update: { active: true },
      create: {
        name,
        type: "INCOME",
      },
    });
  }

  const expenseCategories = [
    "ALQUILER",
    "SERVICIOS",
    "SUELDOS",
    "MANTENIMIENTO",
    "MERCADERIA",
    "OTROS",
  ];

  for (const name of expenseCategories) {
    await prisma.financialCategory.upsert({
      where: {
        name_type: {
          name,
          type: "EXPENSE",
        },
      },
      update: { active: true },
      create: {
        name,
        type: "EXPENSE",
      },
    });
  }

  console.log("✅ Categorías financieras creadas");

  // 5. USUARIO ADMINISTRADOR
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "admin123",
    10
  );

  await prisma.user.upsert({
    where: {
      email: process.env.ADMIN_EMAIL || "admin@gym.com",
    },
    update: {
      name: process.env.ADMIN_NAME || "Administrador",
      roleId: adminRole.id,
      active: true,
    },
    create: {
      name: process.env.ADMIN_NAME || "Administrador",
      email: process.env.ADMIN_EMAIL || "admin@gym.com",
      password: hashedPassword,
      roleId: adminRole.id,
      active: true,
    },
  });

  console.log("✅ Usuario administrador creado");
  console.log("🌱 Seed finalizado correctamente");
  console.log(`📊 Precios configurados:
    - 2 veces por semana: $${plans[0].price}
    - 3 veces por semana: $${plans[1].price}
    - Full Pass: $${plans[2].price}
  `);
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });