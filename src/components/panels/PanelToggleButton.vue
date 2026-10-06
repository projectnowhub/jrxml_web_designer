<template>
  <!-- Collapse / expand a side panel: a panel outline with the side bar that
       collapses (the usual "toggle sidebar" icon) -->
  <button
    type="button"
    class="panel-toggle-button"
    :title="label"
    :aria-label="label"
    :aria-expanded="!collapsed"
    @click="emit('toggle')"
  >
    <component
      :is="side === 'left' ? PanelLeft : PanelRight"
      :size="15"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PanelLeft, PanelRight } from '@lucide/vue';

const props = defineProps<{
  side: 'left' | 'right';
  collapsed: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const { t } = useI18n();

const label = computed(() => {
  const side = props.side === 'left' ? 'Left' : 'Right';
  return t(props.collapsed ? `actions.show${side}Panel` : `actions.hide${side}Panel`);
});
</script>

<style scoped>
.panel-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.panel-toggle-button:hover {
  border-color: #e5e7eb;
  background: #f3f4f6;
  color: #111827;
}

.panel-toggle-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}
</style>
