<template>
  <!-- Default Settings (account menu): what new templates start with, in the
       home page's layout -->
  <section class="default-settings-view">
    <span class="eyebrow">{{ t("defaultSettings.page.eyebrow") }}</span>
    <h1>{{ t("defaultSettings.page.title") }}</h1>
    <p>{{ t("defaultSettings.page.subtitle") }}</p>
    <DefaultSettingsEditor class="editor" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import DefaultSettingsEditor from "@/components/settings/DefaultSettingsEditor.vue";

const { t } = useI18n();
</script>

<style scoped>
.default-settings-view {
  width: 100%;
}
.eyebrow {
  color: #6440f4;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
h1 {
  margin: 10px 0 7px;
  color: #1c1b26;
  font-size: clamp(25px, 3vw, 35px);
}
p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
}
.editor {
  margin-top: 28px;
}
</style>
