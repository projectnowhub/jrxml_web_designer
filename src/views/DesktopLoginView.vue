<template>
  <div class="desktop-login-page">
    <div class="desktop-login-overlay" role="status" aria-live="polite">
      <div class="desktop-login-card">
        <div class="desktop-login-spinner" aria-hidden="true" />
        <p class="desktop-login-title">Redirecting to Login</p>
        <p class="desktop-login-message">Please wait...</p>
      </div>
    </div>

    <div class="desktop-login-background" aria-hidden="true">
      <h1>CDP Platform</h1>
      <p>Desktop application authentication</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { login } from "../services/authService";

onMounted(() => {
  void login({ state: "DESKTOP" });
});
</script>

<style scoped>
.desktop-login-page {
  min-height: 100vh;
  background: #f3f4f6;
}

.desktop-login-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
}

.desktop-login-card {
  display: flex;
  min-width: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border-radius: 1rem;
  background: #fff;
  padding: 2rem;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.desktop-login-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 999px;
  animation: desktop-login-spin 1s linear infinite;
}

.desktop-login-title,
.desktop-login-message {
  margin: 0;
  text-align: center;
}

.desktop-login-title {
  color: #374151;
  font-weight: 500;
}

.desktop-login-message {
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.desktop-login-background {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  text-align: center;
}

.desktop-login-background h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.desktop-login-background p {
  margin: 0;
}

@keyframes desktop-login-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
