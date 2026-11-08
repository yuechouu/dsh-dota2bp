// 采集道具数据：OpenDota constants/items（装备定义）+ 每个英雄的 itemPopularity（购买热度）。
// 结果写 <dataDir>/items.json，供 builds.js 组装出装方案。
// 用法：node tools/update-items.mjs [--data-dir .data] [--delay 1150] [--limit 0]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const UA = "Dota2bp/1.0 (DeepSeek Harness plugin; weekly item refresh)";
const API = "https://api.opendota.com/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value === undefined ? fallback : value;
}

const dataDir = path.resolve(repoRoot, arg("data-dir", ".data"));
const delayMs = Math.max(300, Number(arg("delay", 1150)));
const limit = Number(arg("limit", 0));

async function getJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status === 429) {
    if (attempt > 4) throw new Error(`429 rate limited: ${url}`);
    console.log(`  限流，等 15s（第 ${attempt} 次）`);
    await sleep(15_000);
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
}

async function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value)}\n`, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch (error) {
    if (error.code !== "EEXIST" && error.code !== "EPERM") throw error;
    await fs.rm(file, { force: true });
    await fs.rename(tmp, file);
  }
}

async function loadHeroes() {
  for (const candidate of [path.join(dataDir, "dataset.json"), path.join(repoRoot, "seed.json")]) {
    try {
      const parsed = JSON.parse(await fs.readFile(candidate, "utf8"));
      if (Array.isArray(parsed.heroes) && parsed.heroes.length > 0) {
        console.log(`英雄名单：${candidate}（${parsed.heroes.length} 个）`);
        return parsed.heroes;
      }
    } catch {
      // 换下一个候选
    }
  }
  throw new Error(`找不到英雄名单：${dataDir}/dataset.json 与 seed.json 都不可用`);
}

function pickBucket(bucket, idToKey, keep = 60) {
  return Object.entries(bucket || {})
    .map(([id, count]) => ({ key: idToKey.get(Number(id)), count }))
    .filter((row) => row.key && Number.isFinite(row.count))
    .sort((a, b) => b.count - a.count)
    .slice(0, keep);
}

async function main() {
  const started = Date.now();
  console.log(`道具数据采集 → ${path.join(dataDir, "items.json")}（间隔 ${delayMs}ms）`);

  const [constants, patches] = await Promise.all([
    getJson(`${API}/constants/items`),
    getJson(`${API}/constants/patch`),
  ]);
  const patchList = Array.isArray(patches) ? patches : [];
  const latest = patchList.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0] || null;
  console.log(`装备定义 ${Object.keys(constants).length} 条；最新补丁 ${latest?.name ?? "未知"}`);

  const idToKey = new Map();
  const itemDefs = {};
  for (const [key, def] of Object.entries(constants)) {
    if (!def || typeof def.id !== "number") continue;
    idToKey.set(def.id, key);
    itemDefs[key] = {
      id: def.id,
      name: def.dname || key,
      cost: def.cost ?? 0,
      qual: def.qual ?? null,
      components: Array.isArray(def.components) ? def.components.filter((part) => constants[part]) : [],
      active: Array.isArray(def.abilities) && def.abilities.some((ability) => ability.type === "active" || ability.type === "toggle"),
    };
  }

  const heroes = await loadHeroes();
  const targets = limit > 0 ? heroes.slice(0, limit) : heroes;
  const collected = {};
  let failures = 0;

  for (let index = 0; index < targets.length; index += 1) {
    const hero = targets[index];
    try {
      const popularity = await getJson(`${API}/heroes/${hero.id}/itemPopularity`);
      collected[String(hero.id)] = {
        start: pickBucket(popularity.start_game_items, idToKey),
        early: pickBucket(popularity.early_game_items, idToKey),
        mid: pickBucket(popularity.mid_game_items, idToKey),
        late: pickBucket(popularity.late_game_items, idToKey),
      };
    } catch (error) {
      failures += 1;
      console.log(`  ${hero.name}(${hero.id}) 失败：${error.message}`);
    }
    if ((index + 1) % 10 === 0 || index === targets.length - 1) {
      const elapsed = Math.round((Date.now() - started) / 1000);
      console.log(`  进度 ${index + 1}/${targets.length}（${elapsed}s，失败 ${failures}）`);
    }
    if (index < targets.length - 1) await sleep(delayMs);
  }

  if (failures > targets.length * 0.25) {
    throw new Error(`失败率过高（${failures}/${targets.length}），不覆盖旧数据`);
  }

  const dataset = {
    schema: 1,
    patch: latest ? { version: latest.name, id: latest.id, date: latest.date ?? null } : null,
    fetchedAt: new Date().toISOString(),
    source: {
      items: "https://api.opendota.com/api/constants/items",
      popularity: "https://api.opendota.com/api/heroes/{id}/itemPopularity",
      heroes: targets.length,
      failures,
    },
    itemDefs,
    heroes: collected,
  };

  await fs.mkdir(dataDir, { recursive: true });
  await writeJsonAtomic(path.join(dataDir, "items.json"), dataset);

  const bytes = (await fs.stat(path.join(dataDir, "items.json"))).size;
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`完成：${Object.keys(collected).length} 个英雄，${(bytes / 1024).toFixed(0)}KB，用时 ${seconds}s，失败 ${failures}`);
}

main().catch((error) => {
  console.error(`采集失败：${error.message}`);
  process.exitCode = 1;
});
