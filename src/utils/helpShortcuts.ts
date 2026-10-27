// Every keyboard and mouse shortcut of the designer, as the Quick guide's
// "Keyboard and mouse" tab lists them. Keep it complete: a shortcut added,
// changed or removed anywhere in the editor is changed here too, with its
// texts (help.shortcuts.<id>, help.shortcutGroups.<group>) in every language
// (CLAUDE.md "Help").
//
// A row's `combos` are alternatives (any of them works); each is a list of
// keys and mouse actions pressed together. Keys are shown as written ("Mod" is
// Ctrl, or ⌘ on a Mac: keyLabel in helpDocs.ts); "mouse:<action>" is a mouse
// action (help.mouse.<action>).

export type ShortcutGroupId =
  | "history"
  | "select"
  | "move"
  | "edit"
  | "text"
  | "table"
  | "picture"
  | "location"
  | "view"
  | "file"
  | "ai";

export interface ShortcutRow {
  id: string;
  combos: string[][];
}

const ARROWS = "↑ ↓ ← →";

export const SHORTCUT_GROUPS: { id: ShortcutGroupId; rows: ShortcutRow[] }[] = [
  {
    id: "history",
    rows: [
      { id: "undo", combos: [["Mod", "Z"]] },
      { id: "redo", combos: [["Mod", "Y"]] },
    ],
  },
  {
    id: "select",
    rows: [
      { id: "select", combos: [["mouse:click"]] },
      { id: "selectMore", combos: [["Mod", "mouse:click"], ["Shift", "mouse:click"]] },
      { id: "selectInBox", combos: [["mouse:clickTwice"]] },
      { id: "selectNeighbor", combos: [[ARROWS]] },
    ],
  },
  {
    id: "move",
    rows: [
      { id: "move", combos: [["mouse:drag"]] },
      { id: "nudge", combos: [["Shift", ARROWS]] },
      { id: "resize", combos: [["mouse:dragHandle"]] },
      { id: "keepRatio", combos: [["Shift", "mouse:dragHandle"]] },
      { id: "square", combos: [["Alt", "mouse:dragHandle"]] },
      { id: "noSnap", combos: [["Mod", "mouse:drag"]] },
      { id: "straightLine", combos: [["Shift", "mouse:dragLineEnd"]] },
      { id: "fitText", combos: [["mouse:doubleClickEdge"]] },
      { id: "rotate", combos: [["mouse:rotateButton"]] },
      { id: "partHeight", combos: [["mouse:dragPartLine"]] },
    ],
  },
  {
    id: "edit",
    rows: [
      { id: "copy", combos: [["Mod", "C"]] },
      { id: "paste", combos: [["Mod", "V"]] },
      { id: "pasteHere", combos: [["mouse:rightClickPage"]] },
      { id: "delete", combos: [["Delete"], ["Backspace"]] },
      { id: "moreOptions", combos: [["mouse:rightClick"]] },
      { id: "editItem", combos: [["mouse:doubleClick"]] },
    ],
  },
  {
    id: "text",
    rows: [
      { id: "finishTyping", combos: [["mouse:clickOutside"], ["Mod", "Enter"]] },
      { id: "cancelTyping", combos: [["Esc"]] },
      { id: "bold", combos: [["Mod", "B"]] },
      { id: "italic", combos: [["Mod", "I"]] },
      { id: "underline", combos: [["Mod", "U"]] },
      { id: "link", combos: [["Mod", "K"]] },
      { id: "newLine", combos: [["Enter"]] },
      { id: "lineInList", combos: [["Shift", "Enter"]] },
    ],
  },
  {
    id: "table",
    rows: [
      { id: "tableOpen", combos: [["mouse:doubleClick"]] },
      { id: "cellType", combos: [["Enter"], ["F2"]] },
      { id: "cellMove", combos: [[ARROWS]] },
      { id: "cellSelect", combos: [["Shift", ARROWS], ["Shift", "mouse:click"]] },
      { id: "cellNext", combos: [["Tab"]] },
      { id: "cellPrevious", combos: [["Shift", "Tab"]] },
      { id: "cellClear", combos: [["Delete"]] },
      { id: "tableChooseLine", combos: [["mouse:clickHandle"], ["Shift", "mouse:clickHandle"]] },
      { id: "tableSelectAll", combos: [["Mod", "A"]] },
      { id: "tableLineMenu", combos: [["mouse:rightClickHandle"]] },
      { id: "tableChooseColumn", combos: [["mouse:clickTwice"]] },
      { id: "tableResizeLine", combos: [["mouse:dragTableLine"]] },
      { id: "tableSortColumn", combos: [["mouse:clickColumnHeading"]] },
      { id: "tableClose", combos: [["Esc"]] },
    ],
  },
  {
    id: "picture",
    rows: [
      { id: "crop", combos: [["mouse:doubleClick"]] },
      { id: "cropApply", combos: [["Enter"]] },
      { id: "cropCancel", combos: [["Esc"]] },
    ],
  },
  {
    // The small map in a Location's properties
    id: "location",
    rows: [
      { id: "locationPlacePin", combos: [["mouse:click"]] },
      { id: "locationDragPin", combos: [["mouse:dragPin"]] },
      { id: "locationMoveMap", combos: [["mouse:drag"]] },
      { id: "locationZoomMap", combos: [["mouse:wheel"]] },
    ],
  },
  {
    id: "view",
    rows: [
      { id: "zoomIn", combos: [["Mod", "+"]] },
      { id: "zoomOut", combos: [["Mod", "-"]] },
      { id: "zoomWheel", combos: [["Mod", "mouse:wheel"]] },
      { id: "resetZoom", combos: [["Mod", "0"]] },
      { id: "toggleBottomPanel", combos: [["Mod", "B"]] },
      { id: "panelDown", combos: [["Esc"]] },
    ],
  },
  {
    id: "file",
    rows: [
      { id: "newTemplate", combos: [["Alt", "N"]] },
      { id: "openTemplate", combos: [["Mod", "O"]] },
      { id: "save", combos: [["Mod", "S"]] },
    ],
  },
  {
    id: "ai",
    rows: [
      { id: "aiSend", combos: [["Enter"]] },
      { id: "aiNewLine", combos: [["Shift", "Enter"]] },
      { id: "aiClear", combos: [["Mod", "K"]] },
    ],
  },
];

export const isMouseAction = (token: string) => token.startsWith("mouse:");
export const mouseAction = (token: string) => token.slice("mouse:".length);
