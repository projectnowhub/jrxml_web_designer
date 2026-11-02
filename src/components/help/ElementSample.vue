<template>
  <!-- A help page's picture: the element built as the library builds it and
       drawn by the canvas's own components, scaled to fit (its width follows
       the Help window's, which the user can resize) -->
  <ElementPreview v-if="elements.length" class="sample" :elements="elements" id-prefix="help-sample" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ElementPreview from "../common/ElementPreview.vue";
import { docPageById, SAMPLE_WIDTH, type DocPageId } from "@/utils/helpDocs";
import type { DesignElement } from "@/types";

const props = defineProps<{ page: DocPageId }>();

const { t } = useI18n();

// Built again when the page or the language changes
const elements = computed<DesignElement[]>(() => {
  const build = docPageById(props.page).sample;
  if (!build) return [];
  return build({ availableWidth: SAMPLE_WIDTH, availableHeight: 500, t });
});
</script>

<style scoped>
.sample {
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    #ffffff;
  box-shadow: inset 0 0 0 4px #f7f7fa;
}
</style>
