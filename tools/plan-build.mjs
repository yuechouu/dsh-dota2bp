// 命令行查看「某英雄某位置这版本怎么出装」。
// 用法：node tools/plan-build.mjs --hero 半人马战行者 --pos 3 [--data-dir .data] [--json]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planBuild, resolveHero, formatPlan } from "../builds.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value === undefined ? fallback : value;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function loadHeroes(dataDir) {
  for (const candidate of [path.join(dataDir, "dataset.json"), path.join(repoRoot, "seed.json")]) {
    try {
      const parsed = await readJson(candidate);
      if (Array.isArray(parsed.heroes)) return parsed.heroes;
    } catch {
      // 换下一个候选
    }
  }
  throw new Error("找不到英雄名单（.data/dataset.json 或 seed.json）");
}

async function main() {
  const dataDir = path.resolve(repoRoot, arg("data-dir", ".data"));
  const heroQuery = arg("hero", "");
  const position = Number(arg("pos", 3));
  const asJson = process.argv.includes("--json");

  if (!heroQuery) {
    console.error("用法：node tools/plan-build.mjs --hero 半人马战行者 --pos 3");
    process.exitCode = 2;
    return;
  }

  const heroes = await loadHeroes(dataDir);
  const hero = resolveHero(heroes, heroQuery);
  if (!hero) throw new Error(`认不出英雄：${heroQuery}`);

  const itemsFile = path.join(dataDir, "items.json");
  let items;
  try {
    items = await readJson(itemsFile);
  } catch {
    throw new Error(`缺少 ${itemsFile}，先跑：node tools/update-items.mjs`);
  }

  const plan = planBuild({ hero, position, items });
  if (asJson) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  console.log(formatPlan(plan));
}

main().catch((error) => {
  console.error(`出装方案生成失败：${error.message}`);
  process.exitCode = 1;
});
