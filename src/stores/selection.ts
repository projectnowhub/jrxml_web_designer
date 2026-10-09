// What is selected in the designer: a band, one element (the one the
// properties panel shows), several elements (multi-select), and the element
// whose text is being edited in place. Positions are band / element indexes,
// with parentFrameIndex for an item inside a box.
import { defineStore } from "pinia";
import { ref } from "vue";
import type { EditingElementInfo, SelectedElementInfo } from "@/types";

export const useSelectionStore = defineStore("selection", () => {
  const selectedBandIndex = ref<number | null>(null);
  const selectedElement = ref<SelectedElementInfo | null>(null);
  const selectedElements = ref<SelectedElementInfo[]>([]);
  const editingElement = ref<EditingElementInfo | null>(null);
  // The band last clicked: elements added from the library go there (none
  // yet: Detail)
  const lastClickedBandIndex = ref<number | null>(null);

  // Nothing selected or being edited (a fresh designer)
  function reset() {
    selectedBandIndex.value = null;
    selectedElement.value = null;
    selectedElements.value = [];
    editingElement.value = null;
    lastClickedBandIndex.value = null;
  }

  return { selectedBandIndex, selectedElement, selectedElements, editingElement, lastClickedBandIndex, reset };
});
