<template>
  <BaseModal
    :visible="visible"
    :title="'PDF Template Designer User Guide'"
    :showFooter="false"
    @update:visible="$emit('update:visible', $event)"
    @cancel="closeModal"
    :contentClass="'help-modal-content'"
  >
    <div class="help-content-scroll">
      <h4>1. Template Design Basics</h4>
      <p>This tool is used to visually design PDF report templates for JasperReports, letting you quickly build professional PDF reports via drag and drop.</p>

      <h4>2. Steps</h4>
      <ol>
        <li><strong>Modify an existing JRXML</strong>: open the bottom panel, copy the current JRXML into the code area, then click Apply</li>
        <li><strong>Add elements</strong>: drag elements from the element library on the left into the design area</li>
        <li><strong>Adjust the layout</strong>: drag elements to reposition them, drag the bottom-right corner to resize</li>
        <li><strong>Set properties</strong>: after selecting an element, set its properties in the right-hand panel</li>
        <li><strong>Configure data</strong>: add report parameters and data fields in the left-hand panel</li>
        <li><strong>Generate JRXML</strong>: click the "Generate JRXML" button to export the report template</li>
      </ol>

      <h4>3. Supported Element Types</h4>
      <ul>
        <li>Static text: displays fixed text content</li>
        <li>Text field: displays a dynamic data field</li>
        <li>Image: inserts an image element</li>
        <li>Line: adds a divider line</li>
        <li>Rectangle: adds a border or background block</li>
      </ul>

      <h4>4. Keyboard Shortcuts</h4>
      <table class="shortcuts-table">
        <thead>
          <tr><th>Shortcut</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>S</kbd></td><td>Save the current file</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd></td><td>Undo</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>Y</kbd></td><td>Redo</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>C</kbd></td><td>Copy the selected element</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>V</kbd></td><td>Paste an element</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>B</kbd></td><td>Toggle the bottom JRXML panel</td></tr>
          <tr><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td><td>Delete the selected element</td></tr>
          <tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></td><td>Select a neighboring element</td></tr>
          <tr><td><kbd>Shift</kbd> + <kbd>Arrow key</kbd></td><td>Nudge the element's position (1px)</td></tr>
          <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>0</kbd></td><td>Reset zoom</td></tr>
        </tbody>
      </table>

      <h4>5. Advanced Features</h4>
      <ul>
        <li><strong>Automatic data field creation</strong>: when a dynamic text element's expression references a field that doesn't exist yet (e.g. $F{abc}), the system automatically creates that data field</li>
        <li><strong>Report element deletion</strong>: in the report element list on the left, each element has a delete button on the right; click it to delete that element</li>
        <li><strong>Cross-platform shortcuts</strong>: on macOS, the Command key can be used in place of Ctrl on Windows for keyboard shortcuts</li>
      </ul>

      <h4>6. Notes</h4>
      <ul>
        <li>Elements cannot extend beyond the page boundary</li>
        <li>While editing text, press Enter to confirm or Esc to cancel</li>
        <li>Double-click a static text box to open an input box for editing its text content</li>
        <li>Double-click a dynamic text box to open an input box for editing its expression</li>
        <li>Dragging an element does not update the JRXML in real time; it updates once you release the mouse</li>
        <li>All changes are automatically saved to local storage</li>
      </ul>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue';

// Define props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Define emits
const emit = defineEmits(['update:visible']);

// Close the modal
const closeModal = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
/* Help Modal Specific Styles */
.help-modal-content {
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
}

:deep(.modal-body) {
  padding: 20px;
  overflow-y: auto;
}

.help-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.help-content-scroll h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #444;
}

.help-content-scroll p {
  color: #666;
  margin-bottom: 10px;
  line-height: 1.6;
}

.help-content-scroll ol,
.help-content-scroll ul {
  color: #666;
  margin-bottom: 15px;
  padding-left: 25px;
}

.help-content-scroll li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.help-content-scroll strong {
  color: #333;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 13px;
}

.shortcuts-table th,
.shortcuts-table td {
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  text-align: left;
}

.shortcuts-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #444;
}

.shortcuts-table td {
  color: #555;
}

.shortcuts-table kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}
</style>