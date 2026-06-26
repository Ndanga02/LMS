import { prisma } from "../lib/db";

async function main() {
  console.log("Step 1: Testing Supabase/PostgreSQL connection via Prisma...");

  // Simple raw query to verify connectivity
  const ping = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("  Raw query OK:", ping);

  console.log("Step 2: Prisma model query...");
  let userCount: string | number = "N/A (tables may not exist yet - run prisma db push)";
  try {
    userCount = await prisma.user.count();
  } catch (err: any) {
    if (err.code === 'P2021') {
      userCount = "N/A (run pnpm prisma db push to create tables)";
    } else {
      console.error("Unexpected error counting users:", err?.message || err);
    }
  }
  console.log("Database connection OK. user count or status:", userCount);

  // Optional: list a few tables to confirm schema
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name 
    LIMIT 10
  `;
  console.log("Sample tables:", tables);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    console.error(
      "\nTroubleshooting:\n" +
        "  • Your error (ENETUNREACH on IPv6) means your network/machine can't reach the Direct Connection's IPv6 address.\n" +
        "  • SOLUTION: Use the **Session Pooler** URL from Supabase dashboard instead.\n" +
        "    Go to your project > Connect > Session Pooler (or Transaction Pooler for app).\n" +
        "    Example for your project (replace [YOUR-PASSWORD]):\n" +
        "    postgresql://postgres.tdnveroltaugctvizfyf:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres\n" +
        "  • Set SUPABASE_URL in .env to the pooler string (it is IPv4 compatible).\n" +
        "  • Then re-run: pnpm db:test\n" +
        "  • If still issues, ensure no VPN/firewall blocking, and Supabase project is not paused.\n",
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });