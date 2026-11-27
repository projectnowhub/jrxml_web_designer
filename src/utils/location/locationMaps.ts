// Map pictures of the Location elements: drawn when a Location's place, zoom or
// map size changes, and put into its map part (part of the change's undo step:
// the picture follows the setup like the address does). Preview PDF and
// Download wait for the ones still being drawn (ensureLocationMaps).
//
// Browser only. The designer calls refreshLocationMaps after every JRXML write.

import { reactive } from "vue";
import type { Band, FrameElement, ImageElement } from "@/types";
import { renderMapPicture } from "./locationMap";
import { getLocationSetup, isLocationMap, locationBoxes, mapKey, pictureKeyOf, placePoint, setPictureKey } from "./locationElement";

export type MapState = "loading" | "error";

// Per Location (box uuid): its map is being drawn, or couldn't be (no internet,
// the map server refused); nothing when its picture is up to date
export const mapStates = reactive<Record<string, MapState>>({});

const pending = new Map<string, Promise<void>>();
// The key each failed map was for, so it isn't asked again and again
const failedKeys = new Map<string, string>();

const mapPartOf = (box: FrameElement) => (box.elements ?? []).find(isLocationMap) as ImageElement | undefined;

// Draw the pictures that are out of date. A finished one goes into the
// Location in the report as it is then (undo may have replaced it meanwhile),
// only if that Location still wants it; then `onDrawn` (rewrite the JRXML).
export function refreshLocationMaps(getBands: () => Band[], onDrawn: () => void, retry = false): void {
  for (const box of locationBoxes(getBands())) {
    const map = mapPartOf(box);
    const uuid = box.uuid;
    if (!map || !uuid) continue;
    const setup = getLocationSetup(box);
    const key = mapKey(setup, map.width, map.height);
    if (key === "none" || key === pictureKeyOf(map)) {
      if (mapStates[uuid] && key === pictureKeyOf(map)) delete mapStates[uuid];
      continue;
    }
    if (!retry && failedKeys.get(uuid) === key) continue;
    const job = `${uuid}|${key}`;
    if (pending.has(job)) continue;

    const point = placePoint(setup)!;
    mapStates[uuid] = "loading";
    const width = map.width;
    const height = map.height;
    const work = renderMapPicture({ ...point, zoom: setup.zoom }, width, height)
      .then((picture) => {
        failedKeys.delete(uuid);
        delete mapStates[uuid];
        // The Location may have changed or gone while the picture was drawn
        for (const current of locationBoxes(getBands())) {
          if (current.uuid !== uuid) continue;
          const part = mapPartOf(current);
          if (!part || mapKey(getLocationSetup(current), part.width, part.height) !== key) return;
          part.imageExpression = `"${picture}"`;
          setPictureKey(part, key);
          onDrawn();
        }
      })
      .catch((error) => {
        console.error("Location map failed:", error);
        failedKeys.set(uuid, key);
        mapStates[uuid] = "error";
      })
      .finally(() => pending.delete(job));
    pending.set(job, work);
  }
}

// Wait for the pictures being drawn (before Preview PDF / Download); maps
// that failed earlier are tried again
export async function ensureLocationMaps(getBands: () => Band[], onDrawn: () => void): Promise<void> {
  refreshLocationMaps(getBands, onDrawn, true);
  await Promise.allSettled([...pending.values()]);
}
