import { execSync } from "child_process";

export async function setup() {
  console.log("\n[global-setup] Running Prisma migrations on test database...");
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("[global-setup] Migrations applied.");
  } catch (err) {
    console.warn("[global-setup] Migration deploy failed, trying db push...");
    try {
      execSync("npx prisma db push", {
        stdio: "inherit",
        env: { ...process.env },
      });
      console.log("[global-setup] db push completed.");
    } catch (pushErr) {
      console.error("[global-setup] Failed to set up test database:", pushErr);
      throw pushErr;
    }
  }
}

export async function teardown() {
  console.log("\n[global-teardown] Cleaning up...");
}
