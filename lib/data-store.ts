import { promises as fs } from "node:fs";
import path from "node:path";

import { defaultRuleSet } from "@/lib/default-rules";
import { AnalysisResult, RuleSet } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const historyFileName = "history.json";
const rulesFileName = "rules.json";

async function ensureFile<T>(fileName: string, fallback: T): Promise<string> {
  await fs.mkdir(dataDirectory, { recursive: true });

  const filePath = path.join(dataDirectory, fileName);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
  }

  return filePath;
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  const filePath = await ensureFile(fileName, fallback);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  const filePath = await ensureFile(fileName, data);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getRules(): Promise<RuleSet> {
  return readJsonFile(rulesFileName, defaultRuleSet);
}

export async function saveRules(rules: RuleSet): Promise<RuleSet> {
  const nextRules: RuleSet = {
    ...rules,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(rulesFileName, nextRules);
  return nextRules;
}

export async function getHistory(): Promise<AnalysisResult[]> {
  const items = await readJsonFile<AnalysisResult[]>(historyFileName, []);

  return items.sort((left, right) => {
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export async function saveHistoryItem(item: AnalysisResult): Promise<void> {
  const items = await getHistory();
  const nextItems = [item, ...items].slice(0, 100);
  await writeJsonFile(historyFileName, nextItems);
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const items = await getHistory();
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    return false;
  }

  await writeJsonFile(historyFileName, nextItems);
  return true;
}
