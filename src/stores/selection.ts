// What is selected in the designer: a band, one element (the one the
// properties panel shows), several elements (multi-select), and the element
// whose text is being edited in place. Positions are band / element indexes,
// with parentFrameIndex for an item inside a box.
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { EditingElementInfo, SelectedElementInfo } from "@/types";
import type { CellPos } from "@/utils/customTable";

// Cells selected in a custom table being edited: from the cell first clicked
// (anchor) to the one the selection reaches (focus); `uuid` is the table's
export interface TableCellSelection {
  uuid: string;
  anchor: CellPos;
  focus: CellPos;
}

export const useSelectionStore = defineStore("selection", () => {
  const selectedBandIndex = ref<number | null>(null);
  const selectedElement = ref<SelectedElementInfo | null>(null);
  const selectedElements = ref<SelectedElementInfo[]>([]);
  const editingElement = ref<EditingElementInfo | null>(null);
  const tableCells = ref<TableCellSelection | null>(null);
  // The column chosen in a project-data table (its look in the panel): the
  // table's uuid, the column's key, and optional part (header / data / total)
  const tableColumn = ref<{ uuid: string; key: string; part?: "header" | "data" | "total" } | null>(null);
  // Selecting anything else lets go of the chosen column
  watch(
    () => selectedElement.value?.uuid,
    (uuid) => {
      if (tableColumn.value && tableColumn.value.uuid !== uuid) tableColumn.value = null;
    },
  );
  // The band last clicked: elements added from the library go there (none
  // yet: Detail)
  const lastClickedBandIndex = ref<number | null>(null);
  // The page last clicked or worked on: elements added by clicking a library
  // tile go there (none yet: the first normal page)
  const lastClickedPageIndex = ref<number | null>(null);
  // An element to select and scroll to (by uuid), e.g. the heading of a
  // contents row; the designer does it and clears it
  const revealUuid = ref<string | null>(null);

  // Nothing selected or being edited (a fresh designer)
  function reset() {
    selectedBandIndex.value = null;
    selectedElement.value = null;
    selectedElements.value = [];
    editingElement.value = null;
    tableCells.value = null;
    tableColumn.value = null;
    lastClickedBandIndex.value = null;
    lastClickedPageIndex.value = null;
    revealUuid.value = null;
  }

  return {
    selectedBandIndex,
    revealUuid,
    selectedElement,
    selectedElements,
    editingElement,
    tableCells,
    tableColumn,
    lastClickedBandIndex,
    lastClickedPageIndex,
    reset,
  };
});
