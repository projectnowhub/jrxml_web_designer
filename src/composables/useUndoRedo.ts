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

  // Whether there was a step to undo
  function undo(): boolean {
    if (historyStack.value.length === 0) return false;
    redoStack.value.push(deepClone(options.getState()));
    const previousState = historyStack.value.pop() as State;
    options.applyState(previousState);
    options.onAfterRestore?.();
    return true;
  }

  // Whether there was a step to redo
  function redo(): boolean {
    if (redoStack.value.length === 0) return false;
    historyStack.value.push(deepClone(options.getState()));
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
