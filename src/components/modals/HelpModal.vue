<template>
  <BaseModal
    :visible="visible"
    :title="t('help.title')"
    :showFooter="false"
    @update:visible="$emit('update:visible', $event)"
    @cancel="closeModal"
    :contentClass="'help-modal-content'"
  >
    <div class="help-content-scroll">
      <h4>{{ t("help.basicsTitle") }}</h4>
      <p>{{ t("help.basicsText") }}</p>

      <h4>{{ t("help.stepsTitle") }}</h4>
      <ol>
        <li v-for="step in STEPS" :key="step">
          <strong>{{ t(`help.steps.${step}Title`) }}</strong>: {{ t(`help.steps.${step}Text`) }}
        </li>
      </ol>

      <h4>{{ t("help.elementsTitle") }}</h4>
      <ul>
        <li v-for="element in ELEMENTS" :key="element">{{ t(`help.elements.${element}`) }}</li>
      </ul>

      <h4>{{ t("help.shortcutsTitle") }}</h4>
      <table class="shortcuts-table">
        <thead>
          <tr>
            <th>{{ t("help.shortcutColumn") }}</th>
            <th>{{ t("help.actionColumn") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="shortcut in SHORTCUTS" :key="shortcut.action">
            <td>
              <template v-for="(key, index) in shortcut.keys" :key="index">
                <template v-if="index > 0"> {{ shortcut.joiner }} </template>
                <kbd>{{ key === "Arrow" ? t("help.arrowKey") : key }}</kbd>
              </template>
            </td>
            <td>{{ t(`help.shortcuts.${shortcut.action}`) }}</td>
          </tr>
        </tbody>
      </table>

      <h4>{{ t("help.advancedTitle") }}</h4>
      <ul>
        <li>
          <strong>{{ t("help.advanced.autoFieldsTitle") }}</strong>:
          {{ t("help.advanced.autoFieldsText", { example: "$F{abc}" }) }}
        </li>
        <li>
          <strong>{{ t("help.advanced.deleteTitle") }}</strong>: {{ t("help.advanced.deleteText") }}
        </li>
        <li>
          <strong>{{ t("help.advanced.shortcutsTitle") }}</strong>:
          {{ t("help.advanced.shortcutsText") }}
        </li>
      </ul>

      <h4>{{ t("help.notesTitle") }}</h4>
      <ul>
        <li v-for="note in NOTES" :key="note">{{ t(`help.notes.${note}`) }}</li>
      </ul>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseModal from './BaseModal.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible']);

const { t } = useI18n();

const STEPS = ['modify', 'add', 'layout', 'properties', 'data', 'generate'];
const ELEMENTS = ['staticText', 'textField', 'image', 'line', 'rectangle'];
const NOTES = ['bounds', 'textEditing', 'staticTextEdit', 'textFieldEdit', 'dragUpdate', 'autoSave'];

// "joiner" separates the keys: "+" for a combination, "/" for alternatives, " " for a list
const SHORTCUTS = [
  { keys: ['Ctrl/⌘', 'S'], joiner: '+', action: 'save' },
  { keys: ['Ctrl/⌘', 'Z'], joiner: '+', action: 'undo' },
  { keys: ['Ctrl/⌘', 'Y'], joiner: '+', action: 'redo' },
  { keys: ['Ctrl/⌘', 'C'], joiner: '+', action: 'copy' },
  { keys: ['Ctrl/⌘', 'V'], joiner: '+', action: 'paste' },
  { keys: ['Ctrl/⌘', 'B'], joiner: '+', action: 'toggleBottomPanel' },
  { keys: ['Delete', 'Backspace'], joiner: '/', action: 'delete' },
  { keys: ['↑', '↓', '←', '→'], joiner: '', action: 'selectNeighbor' },
  { keys: ['Shift', 'Arrow'], joiner: '+', action: 'nudge' },
  { keys: ['Ctrl/⌘', '0'], joiner: '+', action: 'resetZoom' },
];

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