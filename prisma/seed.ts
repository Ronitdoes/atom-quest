import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seeding...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@atomquest.com";
  const adminPasswordRaw = process.env.SEED_ADMIN_PASSWORD || "AdmQuest$2026!";
  const adminName = process.env.SEED_ADMIN_NAME || "Demo Admin";

  const managerEmail = process.env.SEED_MANAGER_EMAIL || "manager@atomquest.com";
  const managerPasswordRaw = process.env.SEED_MANAGER_PASSWORD || "MgrQuest#2026!1";
  const managerName = process.env.SEED_MANAGER_NAME || "Demo Manager";

  const employeeEmail = process.env.SEED_EMPLOYEE_EMAIL || "employee@atomquest.com";
  const employeePasswordRaw = process.env.SEED_EMPLOYEE_PASSWORD || "EmpQuest@2026!";
  const employeeName = process.env.SEED_EMPLOYEE_NAME || "Demo Employee";

  const adminPassword = await bcrypt.hash(adminPasswordRaw, 10);
  const managerPassword = await bcrypt.hash(managerPasswordRaw, 10);
  const employeePassword = await bcrypt.hash(employeePasswordRaw, 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      password: adminPassword,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      name: managerName,
      password: managerPassword,
      role: "MANAGER",
    },
    create: {
      email: managerEmail,
      name: managerName,
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create Employee
  const employee = await prisma.user.upsert({
    where: { email: employeeEmail },
    update: {
      name: employeeName,
      password: employeePassword,
      role: "EMPLOYEE",
      managerId: manager.id,
    },
    create: {
      email: employeeEmail,
      name: employeeName,
      password: employeePassword,
      role: "EMPLOYEE",
      managerId: manager.id,
    },
  });

  console.log("Demo accounts created:");
  console.log(`- Admin: ${adminEmail}`);
  console.log(`- Manager: ${managerEmail}`);
  console.log(`- Employee: ${employeeEmail} (Reports to: ${manager.name})`);

  // Create CycleWindows for 2026 cycle
  console.log("Seeding cycle windows...");
  
  // Clean up any cycle windows that are not for the 2026 cycle
  await prisma.cycleWindow.deleteMany({
    where: {
      cycleId: { not: "2026" }
    }
  });

  // 2026 Cycle Windows (forward-looking & upcoming)
  const windows2026 = [
    { quarter: 1, startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-03-31T23:59:59Z"), status: "CLOSED" },
    { quarter: 2, startDate: new Date("2026-04-01T00:00:00Z"), endDate: new Date("2026-06-30T23:59:59Z"), status: "OPEN" },
    { quarter: 3, startDate: new Date("2026-07-01T00:00:00Z"), endDate: new Date("2026-09-30T23:59:59Z"), status: "UPCOMING" },
    { quarter: 4, startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2026-12-31T23:59:59Z"), status: "UPCOMING" },
  ];

  for (const w of windows2026) {
    await prisma.cycleWindow.upsert({
      where: { cycleId_quarter: { cycleId: "2026", quarter: w.quarter } },
      update: { startDate: w.startDate, endDate: w.endDate, status: w.status },
      create: { cycleId: "2026", quarter: w.quarter, startDate: w.startDate, endDate: w.endDate, status: w.status },
    });
  }
  
  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
