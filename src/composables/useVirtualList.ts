// A long list that draws only the rows in view, with TanStack Virtual: the
// library the CDP app's long lists use (@tanstack/react-virtual), here its
// plain core with the Vue glue @tanstack/vue-virtual's useVirtualizer has.
// Rows have one fixed height. The scroll box may come and go (a menu's list):
// it is picked up whenever the ref changes.

import { onScopeDispose, ref, shallowRef, watch, type Ref } from "vue";
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualItem,
} from "@tanstack/virtual-core";

export interface VirtualListOptions {
  scrollElement: Ref<HTMLElement | null>;
  count: () => number;
  rowHeight: number;
  // Rows drawn beyond the visible ones, so scrolling never shows a gap
  overscan?: number;
}

export function useVirtualList({ scrollElement, count, rowHeight, overscan = 6 }: VirtualListOptions) {
  const items = shallowRef<VirtualItem[]>([]);
  const totalSize = ref(0);

  const refresh = (instance: Virtualizer<HTMLElement, HTMLElement>) => {
    items.value = instance.getVirtualItems();
    totalSize.value = instance.getTotalSize();
  };

  const virtualizer = new Virtualizer<HTMLElement, HTMLElement>({
    count: count(),
    getScrollElement: () => scrollElement.value,
    estimateSize: () => rowHeight,
    overscan,
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: refresh,
  });

  const cleanup = virtualizer._didMount();

  watch(
    [scrollElement, count],
    () => {
      virtualizer.setOptions({ ...virtualizer.options, count: count() });
      virtualizer._willUpdate();
      refresh(virtualizer);
    },
    { immediate: true, flush: "post" },
  );

  onScopeDispose(cleanup);

  // Brings a row into view (keyboard moves)
  const scrollToIndex = (index: number) => virtualizer.scrollToIndex(index, { align: "auto" });

  return { items, totalSize, scrollToIndex };
}
