// The watermark's printed picture: drawn when its setup or size changes and put
// into its image (part of that change's undo step, like a Location's map).
// Preview PDF and Download wait for one still being drawn (ensureWatermarks).
//
// Browser only. The designer calls refreshWatermarks after every JRXML write.

import { reactive } from "vue";
import type { Band } from "@/types";
import { renderWatermarkPicture } from "./watermarkDraw";
import { drawnKeyOf, getWatermark, getWatermarkSetup, setDrawnKey, watermarkKey } from "./watermarkElement";

export type WatermarkState = "loading" | "error";

// Per watermark (uuid): its picture is being drawn, or couldn't be (its
// picture file couldn't be loaded); nothing when it is up to date
export const watermarkStates = reactive<Record<string, WatermarkState>>({});

const pending = new Map<string, Promise<void>>();
// The key a failed drawing was for, so it isn't tried again and again
const failedKeys = new Map<string, string>();

// Draw the picture when it is out of date. A finished one goes into the
// watermark as it is then (undo may have replaced it meanwhile), only if it
// still wants it; then `onDrawn` (rewrite the JRXML).
export function refreshWatermarks(getBands: () => Band[], onDrawn: () => void, retry = false): void {
  const watermark = getWatermark(getBands());
  const uuid = watermark?.uuid;
  if (!watermark || !uuid) return;
  const setup = getWatermarkSetup(watermark);
  const key = watermarkKey(setup, watermark.width, watermark.height);
  if (key === drawnKeyOf(watermark)) {
    delete watermarkStates[uuid];
    return;
  }
  // Nothing to print: no picture
  if (key === "none") {
    delete watermarkStates[uuid];
    watermark.imageExpression = "";
    setDrawnKey(watermark, key);
    onDrawn();
    return;
  }
  if (!retry && failedKeys.get(uuid) === key) return;
  const job = `${uuid}|${key}`;
  if (pending.has(job)) return;

  watermarkStates[uuid] = "loading";
  const work = renderWatermarkPicture(setup, watermark.width, watermark.height)
    .then((picture) => {
      failedKeys.delete(uuid);
      delete watermarkStates[uuid];
      const current = getWatermark(getBands());
      if (!current || current.uuid !== uuid) return;
      if (watermarkKey(getWatermarkSetup(current), current.width, current.height) !== key) return;
      current.imageExpression = picture ? `"${picture}"` : "";
      setDrawnKey(current, key);
      onDrawn();
    })
    .catch((error) => {
      console.error("Watermark picture failed:", error);
      failedKeys.set(uuid, key);
      watermarkStates[uuid] = "error";
    })
    .finally(() => pending.delete(job));
  pending.set(job, work);
}

// Wait for the picture being drawn (before Preview PDF / Download); one that
// failed earlier is tried again
export async function ensureWatermarks(getBands: () => Band[], onDrawn: () => void): Promise<void> {
  refreshWatermarks(getBands, onDrawn, true);
  await Promise.allSettled([...pending.values()]);
}
