import { shallowRef } from 'vue';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useUndoRedo<State>(options: {
  maxHistorySize: number;
  getState: () => State;
  applyState: (state: State) => void;
  onAfterRestore?: () => void;
}) {
  const historyStack = shallowRef<State[]>([]);
  const redoStack = shallowRef<State[]>([]);

  function saveStateToHistory() {
    const snapshot = deepClone(options.getState());
    historyStack.value.push(snapshot);
    if (historyStack.value.length > options.maxHistorySize) {
      historyStack.value.shift();
    }
    redoStack.value = [];
  }

  // Steps recorded for an action that then changed nothing (a click on a
  // handle without moving, the report's first state) are skipped, so every
  // undo / redo changes something
  function dropUnchanged(stack: State[], current: string) {
    while (stack.length && JSON.stringify(stack[stack.length - 1]) === current) stack.pop();
  }

  // Whether there was a step to undo
  function undo(): boolean {
    const current = JSON.stringify(options.getState());
    dropUnchanged(historyStack.value, current);
    if (historyStack.value.length === 0) return false;
    redoStack.value.push(JSON.parse(current) as State);
    const previousState = historyStack.value.pop() as State;
    options.applyState(previousState);
    options.onAfterRestore?.();
    return true;
  }

  // Whether there was a step to redo
  function redo(): boolean {
    const current = JSON.stringify(options.getState());
    dropUnchanged(redoStack.value, current);
    if (redoStack.value.length === 0) return false;
    historyStack.value.push(JSON.parse(current) as State);
    const nextState = redoStack.value.pop() as State;
    options.applyState(nextState);
    options.onAfterRestore?.();
    return true;
  }

  // Forget every step (a fresh designer)
  function clear() {
    historyStack.value = [];
    redoStack.value = [];
  }

  return {
    historyStack,
    redoStack,
    saveStateToHistory,
    undo,
    redo,
    clear
  };
}
