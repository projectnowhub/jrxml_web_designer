<template>
  <div class="home-content">
    <div class="content-heading">
      <div>
        <span class="eyebrow">Template workspace</span>
        <h1>Good morning, {{ userName }}</h1>
        <p>Create, organize, and manage your report templates.</p>
      </div>
    </div>
    <section class="section-block">
      <div class="section-heading">
        <h2>Recent templates</h2>
        <button class="view-all" type="button">
          View all <ArrowRight :size="15" :stroke-width="2.25" />
        </button>
      </div>
      <div class="template-grid">
        <article class="template-card new-card" @click="goToDesigner">
          <div class="new-icon">+</div>
          <strong>Create a new template</strong
          ><span>Start with a blank JRXML report</span>
        </article>
        <article
          v-for="template in templates"
          :key="template.name"
          class="template-card"
        >
          <div class="template-preview" :class="template.tone">
            <div class="preview-lines"><i /><i /><i /><i /></div>
            <div class="preview-chart"><b /><b /><b /><b /><b /></div>
          </div>
          <div class="template-info">
            <div class="template-title">
              <strong>{{ template.name }}</strong
              ><button type="button" aria-label="More options">
                <MoreHorizontal :size="17" :stroke-width="2.25" />
              </button>
            </div>
            <span>{{ template.updated }}</span>
            <div class="owner-row">
              <i>{{ template.owner.charAt(0) }}</i> Created by
              {{ template.owner }}
            </div>
          </div>
        </article>
      </div>
    </section>
    <section class="section-block shared-section">
      <div class="section-heading">
        <h2>Shared with you</h2>
        <span class="muted-label">Recently accessed</span>
      </div>
      <div class="empty-state">
        <div><Inbox :size="32" :stroke-width="2" /></div>
        <strong>No shared templates yet</strong
        ><span>Templates shared with you will appear here.</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, Inbox, MoreHorizontal } from "@lucide/vue";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";
import { getTemplates } from "../services";

const router = useRouter();
const storedUser = JSON.parse(
  localStorage.getItem(AUTH_USER_KEY) ?? "{}",
) as {
  firstName?: string;
  name?: string;
  username?: string;
  email?: string;
};
const userName = storedUser.firstName ?? "Designer";
const templates = [
  {
    name: "Monthly sales report",
    updated: "Edited today at 10:24 AM",
    owner: userName,
    tone: "violet",
  },
  {
    name: "Customer invoice",
    updated: "Edited yesterday",
    owner: "Ava Morgan",
    tone: "blue",
  },
  {
    name: "Operations summary",
    updated: "Edited Sep 02, 2026",
    owner: "Liam Chen",
    tone: "green",
  },
];

const goToDesigner = () => {
  router.push("/designer");
};

onMounted(() => {
  getTemplates().then((response) => {
    console.log("Templates fetched:", response);
  }).catch((error) => {
    console.error("Error fetching templates:", error);
  });
});
</script>

<style scoped>
.eyebrow {
  display: inline-block;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 999px;
  color: #6366f1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.content-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 30px;
}
.content-heading .eyebrow {
  display: inline;
  padding: 0;
  margin: 0;
  border: 0;
  background: none;
  color: #6440f4;
  font-size: 10px;
}
.content-heading h1 {
  margin: 10px 0 7px;
  font-size: clamp(25px, 3vw, 35px);
  letter-spacing: -0.035em;
}
.content-heading p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
}
.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.22);
}
.primary-button b {
  font-size: 18px;
  font-weight: 400;
  line-height: 12px;
}
.section-block {
  margin-top: 52px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.view-all,
.muted-label {
  color: #6f6a7e;
  font-size: 11.5px;
}
.view-all {
  border: 0;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  transition: color 0.15s ease;
}
.view-all:hover {
  color: #6440f4;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.template-card {
  overflow: hidden;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.05);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.template-card:hover {
  transform: translateY(-3px);
  border-color: rgba(124, 92, 247, 0.45);
  box-shadow: 0 10px 24px rgba(124, 92, 247, 0.12);
}
.new-card {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-style: dashed;
  background: rgba(124, 92, 247, 0.04);
  color: #45425a;
  cursor: pointer;
}
.new-card span,
.template-info > span,
.empty-state span {
  color: #8a84a3;
  font-size: 11px;
}
.new-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 3px;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
  font-size: 27px;
  font-weight: 500;
}
.template-preview {
  height: 130px;
  padding: 19px;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  background: linear-gradient(135deg, #ede9fe, #f6f4ff);
}
.template-preview.blue {
  background: linear-gradient(135deg, #dbeafe, #f0f5fc);
}
.template-preview.green {
  background: linear-gradient(135deg, #d6f0e8, #eff8f4);
}
.preview-lines {
  display: grid;
  gap: 7px;
  width: 60%;
}
.preview-lines i {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: rgba(92, 76, 166, 0.35);
}
.preview-lines i:not(:first-child) {
  width: 70%;
  background: rgba(92, 76, 166, 0.16);
}
.preview-chart {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 35px;
  margin-top: 15px;
}
.preview-chart b {
  width: 11px;
  height: 40%;
  border-radius: 2px 2px 0 0;
  background: #9d8cff;
  opacity: 0.75;
}
.preview-chart b:nth-child(2) {
  height: 75%;
}
.preview-chart b:nth-child(3) {
  height: 52%;
}
.preview-chart b:nth-child(4) {
  height: 90%;
}
.preview-chart b:nth-child(5) {
  height: 65%;
}
.template-info {
  padding: 14px;
}
.template-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.template-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 600;
}
.template-title button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  background: none;
  color: #8a84a3;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.template-title button:hover {
  color: #6440f4;
  background: rgba(124, 92, 247, 0.08);
}
.template-info > span {
  display: block;
  margin-top: 5px;
}
.owner-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  color: #77718a;
  font-size: 10px;
}
.owner-row i {
  display: inline-grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: rgba(124, 92, 247, 0.12);
  color: #6440f4;
  font-size: 9px;
  font-style: normal;
}
.shared-section {
  margin-top: 54px;
}
.empty-state {
  min-height: 145px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #fafafc;
}
.empty-state > div {
  color: #8172d7;
  font-size: 30px;
  line-height: 25px;
}
.empty-state strong {
  font-size: 12.5px;
  font-weight: 600;
}
@media (max-width: 900px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
  .new-card {
    min-height: 180px;
  }
}
</style>
