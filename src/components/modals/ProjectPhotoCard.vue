<template>
  <!-- One project photo in the picture chooser: the picture (fetched with the
       login, useFileUrl), its name, date and tags, like the CDP Photos page's card -->
  <button
    type="button"
    class="photo-card"
    :class="{ chosen }"
    :aria-pressed="chosen"
    :title="photo.name"
    @click="emit('choose')"
    @dblclick="emit('use')"
  >
    <img v-if="url" :src="url" :alt="photo.name" class="photo-img" draggable="false" />
    <SkeletonBlock v-else-if="loading" height="100%" radius="0" />
    <span v-else class="photo-missing"><ImageOff :size="22" aria-hidden="true" /></span>
    <span class="photo-info">
      <strong>{{ photo.name }}</strong>
      <span v-if="tags" class="photo-tags">{{ tags }}</span>
      <span class="photo-dates">
        <span v-if="takenText"><Camera :size="11" aria-hidden="true" />{{ takenText }}</span>
        <span v-if="uploadedText"><Upload :size="11" aria-hidden="true" />{{ uploadedText }}</span>
      </span>
    </span>
    <span v-if="chosen" class="photo-check"><Check :size="14" :stroke-width="2.75" aria-hidden="true" /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import { Camera, Check, ImageOff, Upload } from "@lucide/vue";
import SkeletonBlock from "@/components/common/SkeletonBlock.vue";
import { fileUrlQuery } from "@/queries/fileQueries";
import { toFileRefParam } from "@/services/helpers/fileRefHelpers";
import type { FileTag } from "@/types/entities/fileTag";

const props = defineProps<{ photo: FileTag; chosen: boolean }>();
const emit = defineEmits<{ choose: []; use: [] }>();

const { locale } = useI18n();

const picture = useQuery(computed(() => fileUrlQuery(toFileRefParam(props.photo.fileRef))));
const url = computed(() => picture.data.value ?? null);
const loading = computed(() => picture.isLoading.value);

const dayText = (value: string | null | undefined) => {
  if (!value) return "";
  const day = new Date(value);
  if (Number.isNaN(day.getTime())) return "";
  return day.toLocaleDateString(locale.value === "ms" ? "ms-MY" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const takenText = computed(() => dayText(props.photo.metadata?.photoTakenAt));
const uploadedText = computed(() => dayText(props.photo.createdDate));
const tags = computed(() => props.photo.tags.map((tag) => tag.name).join(" · "));
</script>

<style scoped>
.photo-card {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #f4f3f8;
  cursor: pointer;
  text-align: left;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.photo-card:hover,
.photo-card:focus-visible {
  border-color: #6440f4;
  outline: none;
}
.photo-card.chosen {
  border-color: #6440f4;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.28);
}
.photo-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-missing {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #b3aec6;
}
.photo-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 22px 10px 8px;
  background: linear-gradient(to top, rgba(18, 16, 30, 0.82), rgba(18, 16, 30, 0));
  color: #ffffff;
}
.photo-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}
.photo-tags {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #d9d2ff;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.photo-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 10.5px;
}
.photo-dates span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.photo-check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #6440f4;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(23, 20, 44, 0.3);
}
</style>
