import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { defaultRuleSet } from "@/lib/default-rules";
import { AnalysisResult, RuleSet } from "@/lib/types";

const diskDataDirectory = path.join(process.cwd(), "data");
const tmpDataDirectory = path.join(os.tmpdir(), "scam-detector-2-data");
let activeDataDirectory = diskDataDirectory;
let isReadOnlyEnvironment = false;

const memoryDataStore: Record<string, unknown> = {};

const historyFileName = "history.json";
const rulesFileName = "rules.json";

function getMemoryValue<T>(fileName: string, fallback: T): T {
  if (fileName in memoryDataStore) {
    return memoryDataStore[fileName] as T;
  }

  memoryDataStore[fileName] = fallback;
  return fallback;
}

function setMemoryValue<T>(fileName: string, data: T): void {
  memoryDataStore[fileName] = data;
}

async function ensureFile<T>(fileName: string, fallback: T): Promise<string | null> {
  if (isReadOnlyEnvironment) {
    return null;
  }

  const filePath = path.join(activeDataDirectory, fileName);

  try {
    await fs.mkdir(activeDataDirectory, { recursive: true });
    await fs.access(filePath).catch(async () => {
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    });
    return filePath;
  } catch {
    if (activeDataDirectory === diskDataDirectory) {
      activeDataDirectory = tmpDataDirectory;
      return ensureFile(fileName, fallback);
    }

    isReadOnlyEnvironment = true;
    return null;
  }
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  if (isReadOnlyEnvironment) {
    return getMemoryValue(fileName, fallback);
  }

  const filePath = await ensureFile(fileName, fallback);

  if (!filePath) {
    return getMemoryValue(fileName, fallback);
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as T;
    setMemoryValue(fileName, parsed);
    return parsed;
  } catch {
    try {
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    } catch {
      isReadOnlyEnvironment = true;
    }
    return fallback;
  }
}

async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  if (isReadOnlyEnvironment) {
    setMemoryValue(fileName, data);
    return;
  }

  const filePath = await ensureFile(fileName, data);

  if (!filePath) {
    setMemoryValue(fileName, data);
    return;
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    setMemoryValue(fileName, data);
  } catch {
    isReadOnlyEnvironment = true;
    setMemoryValue(fileName, data);
  }
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
