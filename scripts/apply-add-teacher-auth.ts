import "dotenv/config";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });
const file = process.argv[2] ?? "drizzle/migrations/0001_add_teacher_auth.sql";
const content = readFileSync(file, "utf-8");

// drizzle 用 --> statement-breakpoint 分隔
const statements = content
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Running ${statements.length} statements from ${file}`);
for (let i = 0; i < statements.length; i++) {
  const s = statements[i];
  const preview = s.replace(/\s+/g, " ").slice(0, 80);
  try {
    await sql.unsafe(s);
    console.log(`  [${i + 1}/${statements.length}] OK: ${preview}`);
  } catch (e: any) {
    console.error(`  [${i + 1}/${statements.length}] FAIL: ${preview}`);
    console.error(`     ${e.message}`);
    await sql.end();
    process.exit(1);
  }
}
await sql.end();
console.log("Done.");
