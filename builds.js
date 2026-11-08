// 出装方案组装：纯逻辑、无网络。
// 数据来自 tools/update-items.mjs 采集的 items.json（OpenDota itemPopularity + constants/items）。
// 口径说明：itemPopularity 是全分位混合统计，不区分位置；位置修正靠下面策展的 POSITION_WEIGHTS。
import { HERO_ALIASES } from "./aliases.js";

export const POSITION_LABELS = {
  1: "一号位（优势路）",
  2: "二号位（中单）",
  3: "三号位（劣单）",
  4: "四号位（游走/辅核）",
  5: "五号位（辅助）",
};

const TAG_CN = {
  farm: "打钱",
  damage: "输出",
  tank: "肉盾",
  aura: "光环",
  save: "保人",
  utility: "功能",
  vision: "视野",
  mobility: "机动",
  magic: "魔法",
  sustain: "续航",
  initiator: "先手",
  defense: "防御",
};

// 位置权重：每个标签在该位置的期望收益倍数（<1 = 该位置不吃这套）。
export const POSITION_WEIGHTS = {
  1: { farm: 1.25, damage: 1.18, sustain: 1.05, tank: 1.0, defense: 1.0, mobility: 1.05, magic: 0.9, initiator: 0.9, utility: 0.85, aura: 0.85, save: 0.7, vision: 0.55 },
  2: { damage: 1.2, magic: 1.15, mobility: 1.1, initiator: 1.05, farm: 0.95, sustain: 0.95, defense: 0.95, tank: 0.95, utility: 0.95, aura: 0.8, save: 0.85, vision: 0.55 },
  3: { tank: 1.3, initiator: 1.28, aura: 1.2, defense: 1.18, utility: 1.1, sustain: 1.05, damage: 0.95, magic: 0.95, mobility: 1.0, farm: 0.85, save: 0.9, vision: 0.6 },
  4: { utility: 1.22, save: 1.2, mobility: 1.18, vision: 1.12, initiator: 1.05, aura: 1.0, magic: 0.95, defense: 0.95, sustain: 0.95, tank: 0.9, damage: 0.85, farm: 0.55 },
  5: { save: 1.35, vision: 1.3, aura: 1.25, sustain: 1.2, utility: 1.15, initiator: 0.95, defense: 0.95, mobility: 0.92, tank: 0.9, magic: 0.85, damage: 0.68, farm: 0.5 },
};

// 真正的消耗品。OpenDota 把「铁树枝干」这类合成小件也标成 consumable，不能只靠 qual 判断。
const CONSUMABLES = new Set([
  "tango",
  "flask",
  "clarity",
  "enchanted_mango",
  "faerie_fire",
  "blood_grenade",
  "royal_jelly",
  "cheese",
  "tpscroll",
  "ward_observer",
  "ward_sentry",
  "ward_dispenser",
  "smoke_of_deceit",
  "dust",
]);

// 常见装备的定位标签（键名与 OpenDota constants/items 一致）。
export const ITEM_TAGS = {
  blink: ["mobility", "initiator"],
  swift_blink: ["mobility", "initiator"],
  overwhelming_blink: ["initiator", "tank"],
  black_king_bar: ["defense", "magic", "initiator"],
  manta: ["damage", "mobility", "sustain"],
  bfury: ["farm", "damage"],
  radiance: ["farm", "damage", "aura"],
  sange_and_yasha: ["damage", "tank", "mobility"],
  satanic: ["sustain", "damage", "tank"],
  butterfly: ["damage", "defense"],
  skadi: ["damage", "tank", "utility"],
  monkey_king_bar: ["damage"],
  abyssal_blade: ["initiator", "damage", "defense"],
  sheepstick: ["utility", "initiator"],
  orchid: ["damage", "utility"],
  bloodthorn: ["damage", "utility"],
  shivas_guard: ["aura", "tank", "defense"],
  crimson_guard: ["aura", "tank"],
  pipe: ["aura", "defense", "magic"],
  lotus_orb: ["save", "utility", "defense"],
  force_staff: ["save", "mobility"],
  glimmer_cape: ["save"],
  guardian_greaves: ["aura", "save", "sustain"],
  mekansm: ["aura", "save"],
  holy_locket: ["sustain", "aura"],
  arcane_boots: ["sustain"],
  tranquil_boots: ["sustain", "save"],
  power_treads: ["damage"],
  phase_boots: ["mobility", "damage"],
  travel_boots: ["mobility", "farm"],
  hand_of_midas: ["farm"],
  helm_of_the_dominator: ["farm", "aura"],
  ancient_janggo: ["aura", "utility"],
  cyclone: ["utility", "save", "mobility"],
  aether_lens: ["magic", "utility"],
  octarine_core: ["magic", "utility"],
  ultimate_scepter: ["magic", "damage", "utility"],
  aghanims_shard: ["utility"],
  harpoon: ["initiator", "damage"],
  echo_sabre: ["damage", "farm"],
  vanguard: ["tank", "defense"],
  blade_mail: ["defense", "damage"],
  heart: ["tank", "sustain"],
  assault: ["aura", "defense", "damage"],
  desolator: ["damage"],
  greater_crit: ["damage"],
  mjollnir: ["farm", "damage"],
  maelstrom: ["farm", "damage"],
  gleipnir: ["initiator", "damage"],
  rod_of_atos: ["utility", "initiator"],
  diffusal_blade: ["damage", "utility"],
  armlet: ["damage", "sustain"],
  mask_of_madness: ["farm", "damage", "sustain"],
  spirit_vessel: ["utility", "damage"],
  ethereal_blade: ["magic", "save"],
  veil_of_discord: ["magic"],
  dagon: ["magic", "damage"],
  witch_blade: ["utility", "damage"],
  solar_crest: ["aura", "utility", "save"],
  hurricane_pike: ["utility", "save", "damage"],
  wind_waker: ["utility", "save"],
  refresher: ["magic", "utility"],
  sphere: ["defense", "magic", "utility", "save"],
  heavens_halberd: ["utility", "defense", "tank"],
  mage_slayer: ["damage", "defense", "magic"],
  pavise: ["save", "defense"],
  ghost: ["save", "defense"],
  bracer: ["tank"],
  wraith_band: ["damage"],
  null_talisman: ["magic"],
  soul_ring: ["sustain", "utility"],
  bottle: ["sustain"],
  ward_observer: ["vision"],
  ward_dispenser: ["vision"],
  dust: ["vision", "utility"],
  smoke_of_deceit: ["utility", "vision"],
  gem: ["vision"],
};

// 只收录确认过中文名的装备，缺的只显示英文名，避免瞎翻译。
export const ITEM_ZH = {
  blink: "跳刀",
  black_king_bar: "黑皇杖",
  manta: "分身斧",
  bfury: "狂战斧",
  radiance: "辉光",
  sange_and_yasha: "双刀",
  satanic: "撒旦之邪力",
  butterfly: "蝴蝶",
  skadi: "冰眼",
  monkey_king_bar: "金箍棒",
  abyssal_blade: "深渊之刃",
  sheepstick: "羊刀",
  orchid: "紫怨",
  bloodthorn: "血棘",
  shivas_guard: "希瓦的守护",
  crimson_guard: "赤红甲",
  pipe: "洞察烟斗",
  lotus_orb: "莲花",
  force_staff: "推推杖",
  glimmer_cape: "微光披风",
  guardian_greaves: "卫士胫甲",
  mekansm: "梅肯斯姆",
  arcane_boots: "秘法鞋",
  tranquil_boots: "静谧之鞋",
  power_treads: "动力鞋",
  phase_boots: "相位鞋",
  travel_boots: "飞鞋",
  hand_of_midas: "点金手",
  ancient_janggo: "战鼓",
  cyclone: "吹风",
  aether_lens: "以太透镜",
  octarine_core: "玲珑心",
  ultimate_scepter: "A杖",
  aghanims_shard: "魔晶",
  harpoon: "鱼叉",
  echo_sabre: "回音刀",
  vanguard: "先锋盾",
  blade_mail: "刃甲",
  heart: "龙心",
  assault: "强袭",
  desolator: "暗灭",
  greater_crit: "大炮",
  mjollnir: "雷神之锤",
  maelstrom: "闪电锤",
  gleipnir: "缚灵索",
  rod_of_atos: "阿托斯",
  diffusal_blade: "散失",
  armlet: "臂章",
  mask_of_madness: "疯狂面具",
  spirit_vessel: "灵匣",
  ethereal_blade: "虚灵刀",
  veil_of_discord: "面纱",
  dagon: "大根",
  witch_blade: "女巫之刃",
  solar_crest: "日冕",
  hurricane_pike: "飓风长戟",
  refresher: "刷新球",
  sphere: "林肯法球",
  heavens_halberd: "天堂之戟",
  mage_slayer: "法师克星",
  bracer: "护腕",
  wraith_band: "幽灵系带",
  soul_ring: "灵魂之戒",
  bottle: "瓶子",
  smoke_of_deceit: "诡计之雾",
};

const PHASES = [
  { id: "start", bucket: "start", label: "开局", limit: 6 },
  { id: "early", bucket: "early", label: "前期", limit: 5 },
  { id: "mid", bucket: "mid", label: "中期", limit: 5 },
  { id: "late", bucket: "late", label: "后期", limit: 5 },
];

export function roleWeight(tags, position) {
  const table = POSITION_WEIGHTS[position];
  if (!table) return 1;
  const values = (tags || []).map((tag) => table[tag]).filter((value) => typeof value === "number");
  if (values.length === 0) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parentIndex(defs) {
  const parents = new Map();
  for (const [key, def] of Object.entries(defs)) {
    for (const component of def.components || []) {
      if (!defs[component]) continue;
      if (!parents.has(component)) parents.set(component, []);
      parents.get(component).push(key);
    }
  }
  return parents;
}

function displayName(key, def) {
  const zh = ITEM_ZH[key];
  return zh ? `${zh}（${def.name}）` : def.name;
}

export function resolveHero(heroes, query) {
  const text = String(query ?? "").trim();
  if (!text) return null;
  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric > 0) {
    const byId = heroes.find((hero) => hero.id === numeric);
    if (byId) return byId;
  }
  const lower = text.toLowerCase();
  const direct = heroes.find(
    (hero) =>
      hero.key === lower ||
      hero.name === text ||
      String(hero.nameEn || "").toLowerCase() === lower,
  );
  if (direct) return direct;
  const aliasKey = HERO_ALIASES[text];
  if (aliasKey) {
    const byAlias = heroes.find((hero) => hero.key === aliasKey);
    if (byAlias) return byAlias;
  }
  return null;
}

/**
 * 生成某个英雄在某个位置的出装方案。
 * @param {object} input
 * @param {object} input.hero { id, name, nameEn, roles, primaryAttr, attackType }
 * @param {number} input.position 1..5
 * @param {object} input.items items.json 的内容
 */
export function planBuild({ hero, position, items }) {
  const pos = Number(position);
  if (!POSITION_LABELS[pos]) throw new Error(`位置必须是 1-5，收到 ${position}`);
  if (!items || !items.itemDefs) throw new Error("items.json 缺失或格式不对");
  const defs = items.itemDefs;
  const buckets = items.heroes?.[String(hero.id)];
  if (!buckets) {
    throw new Error(`缺少英雄 ${hero.name}(${hero.id}) 的道具数据，请先运行 npm run items:update`);
  }

  const parents = parentIndex(defs);
  const bestCount = new Map();
  for (const phase of PHASES) {
    for (const row of buckets[phase.bucket] || []) {
      const prev = bestCount.get(row.key) || 0;
      if (row.count > prev) bestCount.set(row.key, row.count);
    }
  }

  const phases = [];
  const notes = [];

  // 每个道具归到它出场率最高的阶段：跳刀前期也买，但它的主场是中期。
  const bestPhase = new Map();
  for (const phase of PHASES) {
    for (const row of buckets[phase.bucket] || []) {
      if (!defs[row.key]) continue;
      const prev = bestPhase.get(row.key);
      if (!prev || row.count > prev.count) bestPhase.set(row.key, { phase: phase.id, count: row.count });
    }
  }

  function survives(row, phaseId) {
    const def = defs[row.key];
    if (!def) return false;
    if (def.qual === "recipe") return false;
    const consumable = CONSUMABLES.has(row.key);
    if (consumable && phaseId !== "start") return false;
    // 组件折叠：成品也在数据里、且出场率不低于它的一半 → 显示成品。
    for (const parent of parents.get(row.key) || []) {
      if ((bestCount.get(parent) || 0) >= bestCount.get(row.key) * 0.5) return false;
    }
    // 纯属性小件（基础件、便宜、无主动、且能合成）：不是出装决策，滤掉。
    if (!consumable && !def.active && def.cost > 0 && def.cost <= 1000 && (def.components || []).length === 0 && (parents.get(row.key) || []).length > 0) return false;
    // 无定位标签的纯属性中件（Ultimate Orb / Point Booster 这类）：只是某个成品的零件，单独列出来没有意义。
    if (!consumable && !def.active && (ITEM_TAGS[row.key] || []).length === 0 && (parents.get(row.key) || []).length > 0) return false;
    return true;
  }

  const pickedAll = [];
  for (const phase of PHASES) {
    const rows = buckets[phase.bucket] || [];
    const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
    const scored = [];
    for (const row of rows) {
      if (!survives(row, phase.id)) continue;
      if (bestPhase.get(row.key)?.phase !== phase.id) continue;
      const def = defs[row.key];
      const tags = ITEM_TAGS[row.key] || [];
      const weight = roleWeight(tags, pos);
      scored.push({
        key: row.key,
        name: def.name,
        zh: ITEM_ZH[row.key] || null,
        cost: def.cost ?? 0,
        count: row.count,
        share: row.count / total,
        weight: Number(weight.toFixed(3)),
        score: Number((row.count * weight).toFixed(2)),
        tags,
        tagsCn: tags.map((tag) => TAG_CN[tag] || tag),
      });
    }
    scored.sort((a, b) => b.score - a.score || b.count - a.count);
    const chosen = scored.slice(0, phase.limit);
    for (const item of chosen) pickedAll.push({ ...item, phase: phase.id });
    phases.push({ id: phase.id, label: phase.label, items: chosen });
  }

  const core = pickedAll
    .filter((item) => item.phase === "mid" || item.phase === "late")
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 3)
    .map((item) => ({ key: item.key, name: item.name, zh: item.zh, count: item.count, score: item.score, phase: item.phase }));

  notes.push("按购买率排序，不含胜负信息；OpenDota 的 itemPopularity 是全分位混合统计、不区分位置。");
  notes.push("位置修正是策展权重表（builds.js: POSITION_WEIGHTS），不是分位置采样数据。");
  if (!items.patch?.version) notes.push("items.json 里没有补丁信息，请重新跑 items:update。");

  return {
    hero: {
      id: hero.id,
      name: hero.name,
      nameEn: hero.nameEn,
      roles: hero.roles,
      primaryAttr: hero.primaryAttr,
      attackType: hero.attackType,
    },
    position: pos,
    positionLabel: POSITION_LABELS[pos],
    patch: items.patch || null,
    fetchedAt: items.fetchedAt || null,
    phases,
    core,
    notes,
  };
}

export function formatPlan(plan) {
  const lines = [];
  const { hero } = plan;
  lines.push(`英雄  ${hero.name}（${hero.nameEn}）  ${hero.attackType || ""} / ${hero.primaryAttr || ""}`.trim());
  lines.push(`位置  ${plan.positionLabel}`);
  if (plan.patch?.version) {
    const date = plan.patch.date ? `（${String(plan.patch.date).slice(0, 10)}）` : "";
    lines.push(`补丁  ${plan.patch.version}${date}`);
  }
  if (plan.fetchedAt) lines.push(`数据  ${new Date(plan.fetchedAt).toLocaleString("zh-CN", { hour12: false })}`);
  lines.push("");
  for (const phase of plan.phases) {
    if (phase.items.length === 0) continue;
    const text = phase.items
      .map((item) => `${displayName(item.key, { name: item.name })}×${item.count}`)
      .join("、");
    lines.push(`${phase.label.padEnd(2, "　")}  ${text}`);
  }
  if (plan.core.length > 0) {
    lines.push("");
    lines.push(`核心  ${plan.core.map((item) => displayName(item.key, { name: item.name })).join(" → ")}`);
  }
  lines.push("");
  for (const note of plan.notes) lines.push(`· ${note}`);
  return lines.join("\n");
}
