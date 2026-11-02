<template>
  <Teleport to="body">
    <Transition name="menu-pop" appear>
      <div
        ref="menuRef"
        class="data-drop-choice"
        role="menu"
        :aria-label="t('reportData.dropChoice.title', { source: sourceName })"
        :style="menuStyle"
        @mousedown.stop
      >
        <div class="ddc-title">{{ t("reportData.dropChoice.title", { source: sourceName }) }}</div>
        <div class="ddc-options">
          <button
            v-for="option in options"
            :key="option.kind"
            type="button"
            role="menuitem"
            class="ddc-option"
            :disabled="!!option.problem"
            :title="option.problem ?? undefined"
            @click="emit('choose', option.kind)"
          >
            <component :is="option.icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
            <span class="ddc-text">
              <span class="ddc-name">{{ t(`reportData.dropChoice.${option.kind}`) }}</span>
              <span class="ddc-desc">{{ option.problem ?? t(`reportData.dropChoice.${option.kind}Desc`) }}</span>
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// A project's table dropped on empty page space: show it as a data table or
// as a chart (PDFDesigner.vue handleDataSourceDrop). Opens at the drop point,
// kept inside the window; Esc or a click elsewhere closes it.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ChartColumn, Table as TableIcon } from "@lucide/vue";

export type DataDropKind = "table" | "chart";

const props = defineProps<{
  x: number;
  y: number;
  sourceName: string;
  // Why a data table can't go here (outside the Detail section, a cover page…)
  tableProblem?: string | null;
}>();

const emit = defineEmits<{
  choose: [kind: DataDropKind];
  close: [];
}>();

const { t } = useI18n();

const MENU_WIDTH = 272;
const EDGE = 8;

const menuRef = ref<HTMLElement | null>(null);
const menuHeight = ref(150);

const options = computed(() => [
  { kind: "table" as const, icon: TableIcon, problem: props.tableProblem ?? null },
  { kind: "chart" as const, icon: ChartColumn, problem: null },
]);

const menuStyle = computed(() => ({
  left: `${Math.max(EDGE, Math.min(props.x, window.innerWidth - MENU_WIDTH - EDGE))}px`,
  top: `${Math.max(EDGE, Math.min(props.y, window.innerHeight - menuHeight.value - EDGE))}px`,
  width: `${MENU_WIDTH}px`,
}));

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  event.stopPropagation();
  emit("close");
};
const onOutside = (event: MouseEvent) => {
  if (!menuRef.value?.contains(event.target as Node)) emit("close");
};

onMounted(() => {
  nextTick(() => {
    if (menuRef.value) menuHeight.value = menuRef.value.offsetHeight;
    menuRef.value?.querySelector<HTMLButtonElement>(".ddc-option:not(:disabled)")?.focus();
  });
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("mousedown", onOutside, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("mousedown", onOutside, true);
});
</script>

<style scoped>
.data-drop-choice {
  position: fixed;
  z-index: 2000;
  padding: 12px;
  background: #fff;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(23, 20, 44, 0.14);
}

.ddc-title {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #1c1b26;
}

.ddc-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ddc-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  background: #fff;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  color: #555;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.ddc-option svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.ddc-option:not(:disabled):hover,
.ddc-option:not(:disabled):focus-visible {
  outline: none;
  border-color: #6440f4;
  background-color: #f1edff;
  color: #1f2937;
}

.ddc-option:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ddc-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ddc-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.ddc-desc {
  font-size: 11px;
  line-height: 1.35;
  color: #6b7280;
}
</style>
