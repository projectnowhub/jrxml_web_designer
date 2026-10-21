<template>
  <!-- Header "Page" button: which kind of page to add -->
  <div ref="rootRef" class="add-page-menu">
    <button
      type="button"
      class="page-btn"
      :class="{ 'is-open': isOpen }"
      :title="isOpen ? undefined : t('addPageMenu.title')"
      :aria-label="t('addPageMenu.title')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <CopyPlus :size="16" :stroke-width="2" aria-hidden="true" />
      <span v-if="showLabel">{{ t("editorHeader.pageButton") }}</span>
      <ChevronDown class="caret" :class="{ 'is-up': isOpen }" :size="13" aria-hidden="true" />
    </button>
    <Transition name="menu-pop">
      <div v-if="isOpen" class="add-page-popover" role="menu">
        <button type="button" class="add-page-item" role="menuitem" @click="choose('add-page')">
          <FilePlus :size="16" aria-hidden="true" />
          <span class="item-text">
            <strong>{{ t("addPageMenu.normal") }}</strong>
            <small>{{ t("addPageMenu.normalHint") }}</small>
          </span>
        </button>
        <button
          type="button"
          class="add-page-item"
          role="menuitem"
          :disabled="hasCover"
          :title="hasCover ? t('addPageMenu.coverExists') : undefined"
          @click="choose('add-cover')"
        >
          <BookImage :size="16" aria-hidden="true" />
          <span class="item-text">
            <strong>{{ t("addPageMenu.cover") }}</strong>
            <small>{{ hasCover ? t("addPageMenu.coverExists") : t("addPageMenu.coverHint") }}</small>
          </span>
        </button>
        <button type="button" class="add-page-item" role="menuitem" @click="choose('add-contents')">
          <TableOfContents :size="16" aria-hidden="true" />
          <span class="item-text">
            <strong>{{ t("addPageMenu.contents") }}</strong>
            <small>{{ t(hasContents ? "addPageMenu.contentsMoreHint" : "addPageMenu.contentsHint") }}</small>
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { BookImage, ChevronDown, CopyPlus, FilePlus, TableOfContents } from "@lucide/vue";

defineProps<{
  hasCover?: boolean;
  hasContents?: boolean;
  // Show "Page" next to the icon (wide headers)
  showLabel?: boolean;
}>();
const emit = defineEmits<{ "add-page": []; "add-cover": []; "add-contents": [] }>();

const { t } = useI18n();
const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function choose(event: "add-page" | "add-cover" | "add-contents") {
  isOpen.value = false;
  if (event === "add-page") emit("add-page");
  else if (event === "add-cover") emit("add-cover");
  else emit("add-contents");
}

// Closes on a press outside it or Escape
const onPress = (e: MouseEvent) => {
  if (!rootRef.value?.contains(e.target as Node)) isOpen.value = false;
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") isOpen.value = false;
};
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener("mousedown", onPress, true);
    document.addEventListener("keydown", onKey, true);
  } else {
    document.removeEventListener("mousedown", onPress, true);
    document.removeEventListener("keydown", onKey, true);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onPress, true);
  document.removeEventListener("keydown", onKey, true);
});
</script>

<style scoped>
.add-page-menu {
  position: relative;
  display: inline-flex;
}

/* Same look as the header's toolbar buttons */
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #45425a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover,
.page-btn.is-open {
  background-color: rgba(124, 92, 247, 0.08);
  border-color: rgba(124, 92, 247, 0.2);
  color: #5b3ee0;
}

.caret {
  margin-left: -2px;
  opacity: 0.7;
  transition: transform 0.15s ease;
}

.caret.is-up {
  transform: rotate(180deg);
}

.add-page-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1100;
  width: 280px;
  padding: 6px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
}

.add-page-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1c1b26;
  text-align: left;
  cursor: pointer;
}

.add-page-item svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #6440f4;
}

.add-page-item:hover:not(:disabled),
.add-page-item:focus-visible {
  outline: none;
  background: #f4f1ff;
}

.add-page-item:disabled {
  cursor: default;
  opacity: 0.5;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-text strong {
  font-size: 13px;
  font-weight: 600;
}

.item-text small {
  font-size: 11.5px;
  line-height: 1.35;
  color: #6b6880;
}
</style>
