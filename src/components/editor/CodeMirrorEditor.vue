<template>
  <div class="codemirror-wrapper">
    <div ref="editorContainer" class="codemirror-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { EditorState, EditorSelection } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { lineNumbers, keymap, highlightActiveLine, highlightActiveLineGutter, gutter } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';
import { foldGutter, indentOnInput } from '@codemirror/language';
import type { EditorStateConfig } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { html_beautify } from 'js-beautify';

// Define component props
interface Props {
  modelValue: string;
  placeholder?: string;
  readOnly?: boolean;
}

// Define component events
interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'scroll'): void;
}

// Use defineProps and defineEmits
const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  readOnly: false
});

const emit = defineEmits<Emits>();

// Refs
const editorContainer = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
let editorView: EditorView | null = null;

// Search-related state
const showSearch = ref(false);
const searchQuery = ref('');
const searchResultsCount = ref(0);
const currentSearchResult = ref(0);
let searchResults: { from: number; to: number }[] = [];
let currentSearchIndex = 0;

// Create the editor
const createEditor = () => {
  if (!editorContainer.value) return;

  // Editor configuration
  const config: EditorStateConfig = {
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      foldGutter(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      xml(),
      keymap.of([
        ...defaultKeymap
      ]),
      indentOnInput(),
      EditorState.readOnly.of(props.readOnly),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
          fontFamily: '"Consolas", "Monaco", "Courier New", monospace'
        },
        '.cm-scroller': {
          overflow: 'auto'
        },
        '.cm-gutters': {
          backgroundColor: '#f0f0f0',
          borderRight: '1px solid #ddd'
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(74, 144, 226, 0.1)'
        },
        '.cm-focused .cm-selectionBackground': {
          backgroundColor: 'rgba(74, 144, 226, 0.3)'
        },
        '.cm-search-match': {
          backgroundColor: 'rgba(255, 255, 0, 0.4)',
          outline: '1px solid #ffcc00'
        },
        '.cm-search-match-selected': {
          backgroundColor: 'rgba(255, 204, 0, 0.6)',
          outline: '1px solid #ff9900'
        },
        '.cm-foldGutter': {
          width: '20px'
        },
        '.cm-foldGutter-folded, .cm-foldGutter-open': {
          cursor: 'pointer'
        }
      })
    ],
  };
  
  // Create the editor view
  editorView = new EditorView({
    state: EditorState.create(config),
    parent: editorContainer.value
  });
};

// Update the editor content
const updateEditorContent = (content: string) => {
  if (editorView && editorView.state.doc.toString() !== content) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: content
      }
    });
  }
};

// Watch for modelValue changes
watch(() => props.modelValue, (newValue) => {
  updateEditorContent(newValue);
});

// Watch for readOnly changes
watch(() => props.readOnly, (newValue) => {
  if (editorView) {
    // Recreate the editor state to update the readOnly property
    const newState = EditorState.create({
      doc: editorView.state.doc,
      extensions: [
        lineNumbers(),
        foldGutter(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        xml(),
        keymap.of([
          ...defaultKeymap,
          {
            key: 'Ctrl-F',
            run: () => {
              toggleSearch();
              return true;
            }
          }
        ]),
        indentOnInput(),
        EditorState.readOnly.of(newValue),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            emit('update:modelValue', update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace'
          },
          '.cm-scroller': {
            overflow: 'auto'
          },
          '.cm-gutters': {
            backgroundColor: '#f0f0f0',
            borderRight: '1px solid #ddd'
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(74, 144, 226, 0.1)'
          },
          '.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(74, 144, 226, 0.3)'
          },
          '.cm-search-match': {
            backgroundColor: 'rgba(255, 255, 0, 0.4)',
            outline: '1px solid #ffcc00'
          },
          '.cm-search-match-selected': {
            backgroundColor: 'rgba(255, 204, 0, 0.6)',
            outline: '1px solid #ff9900'
          },
          '.cm-foldGutter': {
            width: '20px'
          },
          '.cm-foldGutter-folded, .cm-foldGutter-open': {
            cursor: 'pointer'
          }
        })
      ]
    });
    
    editorView.setState(newState);
  }
});

// Create the editor when the component is mounted
onMounted(() => {
  createEditor();
});

// Destroy the editor before the component is unmounted
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});

// Search-related methods
const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    // Delay focusing the search input to ensure the DOM has updated
    setTimeout(() => {
      searchInput.value?.focus();
    }, 100);
  }
};

const performSearch = () => {
  if (!editorView) return;
  
  const query = searchQuery.value;
  if (!query) {
    clearSearchHighlights();
    searchResultsCount.value = 0;
    currentSearchResult.value = 0;
    searchResults = [];
    currentSearchIndex = 0;
    return;
  }
  
  // Perform the search
  searchResults = [];
  const doc = editorView.state.doc;
  const text = doc.toString();
  let index = 0;
  
  while ((index = text.indexOf(query, index)) !== -1) {
    const result = {
      from: index,
      to: index + query.length
    };
    searchResults.push(result);
    index += query.length;
  }
  
  // Update the search results count
  searchResultsCount.value = searchResults.length;
  currentSearchIndex = 0;
  currentSearchResult.value = searchResults.length > 0 ? 1 : 0;

  // Scroll to the first match
  if (searchResults.length > 0) {
    scrollToResult(currentSearchIndex);
  }
};

const findNext = () => {
  if (!editorView || searchResults.length === 0) return;
  
  currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
  currentSearchResult.value = currentSearchIndex + 1;
  scrollToResult(currentSearchIndex);
};

const findPrevious = () => {
  if (!editorView || searchResults.length === 0) return;
  
  currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
  currentSearchResult.value = currentSearchIndex + 1;
  scrollToResult(currentSearchIndex);
};

const closeSearch = () => {
  showSearch.value = false;
  clearSearchHighlights();
  searchResultsCount.value = 0;
  currentSearchResult.value = 0;
  searchResults = [];
  currentSearchIndex = 0;
};

const clearSearchHighlights = () => {
  if (!editorView) return;
  
  // Reset the selection
  editorView.dispatch({
    selection: { anchor: 0, head: 0 }
  });
};

const scrollToResult = (index: number) => {
  if (!editorView || index < 0 || index >= searchResults.length) return;

  const result = searchResults[index];
  if (result) {
    editorView.dispatch({
      selection: { anchor: result.from, head: result.to }
    });

    // Scroll to the result position
    editorView.dispatch({
      effects: EditorView.scrollIntoView(result.from, {
        yMargin: 50,
        xMargin: 10
      })
    });
  }
};

// Jump to a specific line
const jumpToLine = (line: number, column: number) => {
  if (!editorView) return;
  
  const doc = editorView.state.doc;
  const lineInfo = doc.line(line);
  
  if (lineInfo) {
    const position = lineInfo.from + (column - 1);
    
    editorView.dispatch({
      selection: { anchor: position, head: position }
    });
    
    editorView.dispatch({
      effects: EditorView.scrollIntoView(position, {
        yMargin: 50,
        xMargin: 10
      })
    });
    
    editorView.focus();
  }
};

// Perform a search using a given query (called by the parent component)
const performSearchWith = (query: string): number => {
  if (!editorView) return 0;
  if (!query) {
    clearSearchHighlights();
    searchResults = [];
    currentSearchIndex = 0;
    return 0;
  }
  searchResults = [];
  const text = editorView.state.doc.toString();
  let index = 0;
  while ((index = text.indexOf(query, index)) !== -1) {
    searchResults.push({ from: index, to: index + query.length });
    index += query.length;
  }
  currentSearchIndex = 0;
  if (searchResults.length > 0) scrollToResult(0);
  return searchResults.length;
};

// Formatting: use js-beautify's html_beautify to format XML
const BEAUTIFY_OPTS = {
  indent_size: 2,
  wrap_attributes: 'auto',
  wrap_line_length: 120,
  content_unformatted: [
    'text', 'textFieldExpression', 'parameterExpression', 'queryString',
    'sortField', 'groupExpression', 'reportFont', 'property',
    'propertyExpression', 'font'
  ],
  extra_liners: ['text', 'textFieldExpression', 'parameterExpression', 'queryString']
};

const formatDocument = () => {
  if (!editorView) return;
  const content = editorView.state.doc.toString();
  const formatted = html_beautify(content, BEAUTIFY_OPTS);
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: formatted },
    selection: EditorSelection.cursor(0)
  });
};

// Expose methods to the parent component
defineExpose({
  focus: () => { editorView?.focus(); },
  getEditor: () => editorView,
  performSearchWith,
  findNext,
  findPrevious,
  closeSearch,
  jumpToLine,
  formatDocument
});
</script>

<style scoped>
.codemirror-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
}

.codemirror-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Ensure CodeMirror styles apply correctly */
:deep(.cm-editor) {
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

:deep(.cm-scroller) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

:deep(.cm-gutters) {
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
}

:deep(.cm-activeLineGutter) {
  background-color: #e8f4f8;
}

:deep(.cm-activeLine) {
  background-color: rgba(74, 144, 226, 0.1);
}

:deep(.cm-focused .cm-selectionBackground) {
  background-color: rgba(74, 144, 226, 0.3);
}

:deep(.cm-cursor) {
  border-left-color: #333;
}
</style>
