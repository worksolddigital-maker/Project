/**
 * Records the current market picture (real quotes and headlines) to a JSON file.
 *   npx tsx --conditions=react-server scripts/market-snapshot.ts demo/market-snapshot.json
 * Used to embed a dated snapshot in the standalone demo and as an offline fixture
 * (MARKET_FIXTURE_FILE). Never edit the output by hand.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { getMarketSnapshot } from "../src/server/market/service";

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Usage: market-snapshot.ts <output.json>");
  const snap = await getMarketSnapshot();
  const failed = snap.sources.filter((s) => !s.ok);
  // Offline (or every source down): keep the previous recording instead of an empty one.
  if ((!snap.quotes.length || !snap.news.length) && existsSync(out)) {
    console.warn(`Sem dados suficientes agora; mantendo ${out} anterior.`);
    return;
  }
  await writeFile(out, JSON.stringify(snap, null, 1));
  console.log(`${snap.quotes.length} cotações, ${snap.news.length} manchetes, ${snap.sources.length - failed.length}/${snap.sources.length} fontes OK`);
  for (const s of failed) console.log(`  falhou: ${s.label} — ${s.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
