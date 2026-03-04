import { getApp, ensureAuth } from './cosClient';

const COLLECTION = 'content';
const DOC_ID = 'media_slots';

export type ContentMap = Record<string, string>;

/**
 * 从 CloudBase 数据库读取所有「槽位 → URL」映射，部署到 Vercel 或换设备后仍能恢复。
 */
export async function getContentMap(): Promise<ContentMap> {
  const app = getApp();
  if (!app) return {};

  await ensureAuth();

  const db = (app as any).database?.();
  if (!db) return {};

  try {
    const res = await db.collection(COLLECTION).doc(DOC_ID).get();
    // CloudBase .doc().get() 返回 { data: Array }，单条文档时取 data[0]
    const raw = Array.isArray(res?.data) ? res.data[0] : res?.data;
    if (raw && typeof raw.slots === 'object') return raw.slots as ContentMap;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[contentStore] getContentMap failed:', e);
  }
  return {};
}

/**
 * 将单个 key 的 URL 写入 CloudBase，并返回合并后的完整 map（便于前端更新状态）。
 */
export async function setContentKey(key: string, url: string): Promise<ContentMap> {
  const app = getApp();
  if (!app) return {};

  await ensureAuth();

  const db = (app as any).database?.();
  if (!db) return {};

  try {
    const current = await getContentMap();
    const next: ContentMap = { ...current, [key]: url };
    await db.collection(COLLECTION).doc(DOC_ID).set({ slots: next });
    return next;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[contentStore] setContentKey failed:', e);
    return {};
  }
}

/**
 * 将本地已有的一批 key→url 合并写入云端（用于一次性把 localStorage 中的数据迁移到数据库）。
 */
export async function mergeContentMap(local: ContentMap): Promise<ContentMap> {
  const app = getApp();
  if (!app) return local;

  await ensureAuth();

  const db = (app as any).database?.();
  if (!db) return local;

  try {
    const current = await getContentMap();
    const next: ContentMap = { ...current, ...local };
    await db.collection(COLLECTION).doc(DOC_ID).set({ slots: next });
    return next;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[contentStore] mergeContentMap failed:', e);
    return local;
  }
}

