// 重建 schema — 從 drizzle/migrations/0000_initial_postgres.sql 讀 SQL 執行
import postgres from "postgres";
import fs from "fs";

const url = process.env.DATABASE_URL;
if (!url) { throw new Error("DATABASE_URL not set"); }

const sql = postgres(url);

const migration = fs.readFileSync(
  "./drizzle/migrations/0000_initial_postgres.sql",
  "utf8"
);

// 拆成多個 statement 執行（postgres 不支援一次跑多個用 ; 分隔的 CREATE）
const statements = migration
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Found ${statements.length} statements to execute.`);

let ok = 0;
let err = 0;
for (const stmt of statements) {
  try {
    await sql.unsafe(stmt);
    const firstLine = stmt.split("\n")[0].slice(0, 70);
    console.log(`✓ ${firstLine}`);
    ok++;
  } catch (e: any) {
    const firstLine = stmt.split("\n")[0].slice(0, 70);
    console.log(`✗ ${firstLine}`);
    console.log(`  → ${e.message}`);
    err++;
  }
}

console.log(`\nDone: ${ok} succeeded, ${err} failed`);
await sql.end();