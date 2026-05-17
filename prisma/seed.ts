import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seeding...");

  const adminPassword = await bcrypt.hash("AdmQuest$2026!", 10);
  const managerPassword = await bcrypt.hash("MgrQuest#2026!", 10);
  const employeePassword = await bcrypt.hash("EmpQuest@2026!", 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@atomquest.com" },
    update: {
      password: adminPassword,
      role: "ADMIN",
    },
    create: {
      email: "admin@atomquest.com",
      name: "Demo Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: "manager@atomquest.com" },
    update: {
      password: managerPassword,
      role: "MANAGER",
    },
    create: {
      email: "manager@atomquest.com",
      name: "Demo Manager",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create Employee
  const employee = await prisma.user.upsert({
    where: { email: "employee@atomquest.com" },
    update: {
      password: employeePassword,
      role: "EMPLOYEE",
      managerId: manager.id,
    },
    create: {
      email: "employee@atomquest.com",
      name: "Demo Employee",
      password: employeePassword,
      role: "EMPLOYEE",
      managerId: manager.id,
    },
  });

  console.log("Demo accounts created:");
  console.log(`- Admin: admin@atomquest.com`);
  console.log(`- Manager: manager@atomquest.com`);
  console.log(`- Employee: employee@atomquest.com (Reports to: ${manager.name})`);

  // Create CycleWindows for 2024 and 2026 cycles
  console.log("Seeding cycle windows...");
  
  // 2024 Cycle Windows (historical/active)
  const windows2024 = [
    { quarter: 1, startDate: new Date("2024-01-01T00:00:00Z"), endDate: new Date("2024-03-31T23:59:59Z"), status: "CLOSED" },
    { quarter: 2, startDate: new Date("2024-04-01T00:00:00Z"), endDate: new Date("2024-06-30T23:59:59Z"), status: "CLOSED" },
    { quarter: 3, startDate: new Date("2024-07-01T00:00:00Z"), endDate: new Date("2024-09-30T23:59:59Z"), status: "CLOSED" },
    { quarter: 4, startDate: new Date("2024-10-01T00:00:00Z"), endDate: new Date("2024-12-31T23:59:59Z"), status: "CLOSED" },
  ];

  for (const w of windows2024) {
    await prisma.cycleWindow.upsert({
      where: { cycleId_quarter: { cycleId: "2024", quarter: w.quarter } },
      update: { startDate: w.startDate, endDate: w.endDate, status: w.status },
      create: { cycleId: "2024", quarter: w.quarter, startDate: w.startDate, endDate: w.endDate, status: w.status },
    });
  }

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
