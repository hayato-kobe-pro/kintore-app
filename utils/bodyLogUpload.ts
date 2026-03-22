import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadString,
  type FirebaseStorage,
} from "firebase/storage";

const BODY_LOG_SLOTS = ["front", "back", "side", "extra"] as const;
type BodyLogSlotKey = (typeof BODY_LOG_SLOTS)[number];

export function isImageDataUrl(s: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(s);
}

export function storagePathForSlot(
  uid: string,
  entryId: string,
  slot: BodyLogSlotKey,
) {
  return `users/${uid}/bodyLogs/${entryId}/${slot}`;
}

export async function uploadDataUrlToPath(
  storage: FirebaseStorage,
  path: string,
  dataUrl: string,
): Promise<string> {
  const r = storageRef(storage, path);
  await uploadString(r, dataUrl, "data_url");
  return getDownloadURL(r);
}

/** Firebase Storage のダウンロード URL からオブジェクトパスを復元 */
export function storagePathFromDownloadUrl(url: string): string | null {
  try {
    const m = url.match(/\/o\/([^?]+)/);
    if (!m?.[1]) return null;
    return decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/** エントリに紐づく 4 スロットのオブジェクトをベストエフォートで削除 */
export async function deleteEntryStorageFiles(
  storage: FirebaseStorage,
  uid: string,
  entryId: string,
) {
  for (const slot of BODY_LOG_SLOTS) {
    const p = storagePathForSlot(uid, entryId, slot);
    try {
      await deleteObject(storageRef(storage, p));
    } catch {
      /* 未アップロード・既削除など */
    }
  }
}

export async function tryDeleteObjectByDownloadUrl(
  storage: FirebaseStorage,
  downloadUrl: string | null | undefined,
) {
  if (!downloadUrl || isImageDataUrl(downloadUrl)) return;
  const path = storagePathFromDownloadUrl(downloadUrl);
  if (!path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch {
    /* 既に削除済みなど */
  }
}

export type SlotUrls = {
  front: string | null;
  back: string | null;
  side: string | null;
  extra: string | null;
};

/** 新規: data URL のみ想定。HTTP URL はそのまま通す。 */
export async function uploadEntrySlotsFromRaw(
  storage: FirebaseStorage,
  uid: string,
  entryId: string,
  raw: SlotUrls,
): Promise<SlotUrls> {
  const out: SlotUrls = {
    front: null,
    back: null,
    side: null,
    extra: null,
  };
  for (const slot of BODY_LOG_SLOTS) {
    const v = raw[slot];
    if (!v) continue;
    if (isImageDataUrl(v)) {
      const path = storagePathForSlot(uid, entryId, slot);
      out[slot] = await uploadDataUrlToPath(storage, path, v);
    } else {
      out[slot] = v;
    }
  }
  return out;
}

/** 更新: null は削除、data URL は再アップロード、HTTP は据え置き */
export async function resolveSlotsForUpdate(
  storage: FirebaseStorage,
  uid: string,
  entryId: string,
  prev: SlotUrls,
  next: SlotUrls,
): Promise<SlotUrls> {
  const out: SlotUrls = {
    front: null,
    back: null,
    side: null,
    extra: null,
  };

  for (const slot of BODY_LOG_SLOTS) {
    const n = next[slot];
    const p = prev[slot];

    if (n === null) {
      await tryDeleteObjectByDownloadUrl(storage, p);
      out[slot] = null;
      continue;
    }

    if (isImageDataUrl(n)) {
      await tryDeleteObjectByDownloadUrl(storage, p);
      const path = storagePathForSlot(uid, entryId, slot);
      out[slot] = await uploadDataUrlToPath(storage, path, n);
      continue;
    }

    out[slot] = n;
  }

  return out;
}
