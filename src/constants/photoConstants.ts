// The picture chooser's project photos (modals/PictureChooserModal.vue), as
// the CDP app's Photos page.
import type { PhotoPeriod } from "@/types/projectPhoto";

// Photos a page (the CDP Photos page's PAGE_SIZE)
export const PHOTO_PAGE_SIZE = 20;

// The filter bar's periods, in order; days back from today (the CDP FilterBar's presets)
export const PHOTO_PERIODS: readonly PhotoPeriod[] = ["all", "today", "7d", "15d", "1m", "3m", "6m", "custom"];
export const PHOTO_PERIOD_DAYS: Readonly<Partial<Record<PhotoPeriod, number>>> = {
  today: 0,
  "7d": 7,
  "15d": 15,
  "1m": 30,
  "3m": 90,
  "6m": 180,
};
