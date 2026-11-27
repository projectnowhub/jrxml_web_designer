<template>
  <!-- Which columns the table shows: every column of the source with a tick,
       base columns then user-defined ones. Ticking adds a column at the end,
       unticking removes it; the list stays open, so several can be chosen in
       a row (it closes on Esc or a click outside). The look of the filters'
       "fields shown" list. -->
  <div ref="root" class="tcp">
    <button
      type="button"
      class="tcp-trigger"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <ListChecks :size="13" aria-hidden="true" />
      <span class="tcp-trigger-text">{{ t("dataTable.config.chooseColumns") }}</span>
      <span class="tcp-count">{{ t("dataTable.config.columnsChosen", { shown: chosen.length, total: columns.length }) }}</span>
      <ChevronDown :size="14" class="tcp-chevron" aria-hidden="true" />
    </button>
    <div v-if="open" class="tcp-menu" role="dialog" :aria-label="t('dataTable.config.chooseColumns')" @keydown.esc.stop="open = false">
      <div class="tcp-search">
        <Search :size="12" aria-hidden="true" />
        <input ref="searchInput" v-model="search" :placeholder="t('dataTable.filter.searchFields')" />
      </div>
      <div class="tcp-actions">
        <button type="button" class="tcp-link" @click="emit('set', columns.map((c) => c.key))">
          {{ t("dataTable.filter.selectAll") }}
        </button>
        <button type="button" class="tcp-link" @click="emit('set', [])">{{ t("dataTable.filter.clearAll") }}</button>
      </div>
      <div class="tcp-list">
        <template v-for="group in groups" :key="group.key">
          <div class="tcp-group">{{ group.title }}</div>
          <label v-for="col in group.columns" :key="col.key" class="tcp-row">
            <input type="checkbox" :checked="chosen.includes(col.key)" @change="emit('toggle', col.key)" />
            <Zap v-if="col.userDefined" :size="11" class="tcp-bolt" aria-hidden="true" />
            <span>{{ col.label }}</span>
          </label>
        </template>
        <p v-if="!groups.length" class="tcp-empty">{{ t("dataTable.filter.noFieldsMatch", { words: search }) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, ListChecks, Search, Zap } from "@lucide/vue";
import type { DataColumn } from "@/types/dataSource";

const props = defineProps<{
  // Every column of the source
  columns: DataColumn[];
  // The keys the table shows
  chosen: string[];
}>();

const emit = defineEmits<{
  // Show or hide one column
  toggle: [key: string];
  // Show exactly these (Select all / Clear all)
  set: [keys: string[]];
}>();

const { t } = useI18n();

const open = ref(false);
const search = ref("");
const root = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

// Base columns, then user-defined ones (as Report Data lists them), narrowed by the search
const groups = computed(() => {
  const q = search.value.trim().toLowerCase();
  const shown = q ? props.columns.filter((c) => c.label.toLowerCase().includes(q)) : props.columns;
  return [
    { key: "standard", title: t("reportData.standardFields"), columns: shown.filter((c) => !c.userDefined) },
    { key: "custom", title: t("reportData.customFields"), columns: shown.filter((c) => c.userDefined) },
  ].filter((group) => group.columns.length);
});

watch(open, async (isOpen) => {
  if (!isOpen) {
    search.value = "";
    return;
  }
  await nextTick();
  searchInput.value?.focus();
});

// Closes on a click elsewhere
function closeOutside(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener("pointerdown", closeOutside, true));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeOutside, true));
</script>

<style scoped>
.tcp {
  position: relative;
  margin-bottom: 10px;
}

.tcp-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12.5px;
  cursor: pointer;
}

.tcp-trigger:hover,
.tcp-trigger.is-open {
  border-color: #6440f4;
}

.tcp-trigger-text {
  flex: 1;
  text-align: left;
}

.tcp-count {
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 600;
}

.tcp-chevron {
  color: #6f6a7e;
}

.tcp-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(28, 27, 38, 0.14);
}

.tcp-search {
  position: relative;
}

.tcp-search svg {
  position: absolute;
  top: 50%;
  left: 10px;
  color: #9a96a8;
  transform: translateY(-50%);
}

.tcp-search input {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 28px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12.5px;
}

.tcp-search input:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.tcp-actions {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.tcp-link {
  padding: 0;
  border: none;
  background: none;
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.tcp-link:hover {
  color: #1c1b26;
}

.tcp-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.tcp-group {
  margin: 4px 6px 2px;
  color: #8a8799;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tcp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  color: #45425a;
  font-size: 12px;
  cursor: pointer;
}

.tcp-row:hover {
  background: #f6f5fa;
}

.tcp-row input {
  flex: none;
  accent-color: #6440f4;
}

.tcp-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tcp-bolt {
  flex: none;
  color: #f59e0b;
}

.tcp-empty {
  margin: 4px 6px;
  color: #9a96a8;
  font-size: 12px;
}
</style>
