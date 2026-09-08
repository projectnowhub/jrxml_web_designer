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
          View all <ArrowRight :size="14" />
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
                <MoreHorizontal :size="16" />
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
        <div><Inbox :size="30" :stroke-width="1.6" /></div>
        <strong>No shared templates yet</strong
        ><span>Templates shared with you will appear here.</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowRight, Inbox, MoreHorizontal } from "@lucide/vue";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";

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
</script>

<style scoped>
.eyebrow {
  display: inline-block;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  color: #a5b4fc;
  font-size: 11px;
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
  color: #9d8cff;
  font-size: 10px;
}
.content-heading h1 {
  margin: 10px 0 7px;
  font-size: clamp(25px, 3vw, 35px);
  letter-spacing: -0.035em;
}
.content-heading p {
  margin: 0;
  color: #8b869a;
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
  font-size: 15px;
  font-weight: 650;
}
.view-all,
.muted-label {
  color: #918ba3;
  font-size: 11px;
}
.view-all {
  border: 0;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.template-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  background: rgba(20, 19, 29, 0.82);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}
.template-card:hover {
  transform: translateY(-3px);
  border-color: rgba(124, 92, 247, 0.5);
}
.new-card {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-style: dashed;
  background: rgba(124, 92, 247, 0.045);
  color: #e9e6f5;
  cursor: pointer;
}
.new-card span,
.template-info > span,
.empty-state span {
  color: #777285;
  font-size: 11px;
}
.new-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 3px;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.16);
  color: #aa99ff;
  font-size: 27px;
  font-weight: 300;
}
.template-preview {
  height: 130px;
  padding: 19px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, #2c234a, #1d1b2a);
}
.template-preview.blue {
  background: linear-gradient(135deg, #1e3448, #1b202d);
}
.template-preview.green {
  background: linear-gradient(135deg, #1c3937, #1c252b);
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
  background: rgba(255, 255, 255, 0.38);
}
.preview-lines i:not(:first-child) {
  width: 70%;
  background: rgba(255, 255, 255, 0.18);
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
  justify-content: space-between;
  gap: 8px;
}
.template-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.template-title button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  background: none;
  color: #777285;
  cursor: pointer;
}
.template-info > span {
  display: block;
  margin-top: 5px;
}
.owner-row {
  gap: 6px;
  margin-top: 14px;
  color: #858092;
  font-size: 10px;
}
.owner-row i {
  width: 19px;
  height: 19px;
  font-size: 9px;
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
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  background: rgba(17, 16, 25, 0.55);
}
.empty-state > div {
  color: #8172d7;
  font-size: 30px;
  line-height: 25px;
}
.empty-state strong {
  font-size: 12px;
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
