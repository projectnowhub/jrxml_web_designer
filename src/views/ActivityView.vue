<template>
  <section class="activity-view">
    <span class="eyebrow">Workspace</span>
    <h1>Activity</h1>
    <p>View recent activity and changes across your workspace.</p>
  </section>
</template>

<style scoped>
.activity-view {
  max-width: 720px;
}

.eyebrow {
  color: #9d8cff;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1 {
  margin: 10px 0 7px;
  color: #f4f4f5;
  font-size: clamp(25px, 3vw, 35px);
}

p {
  margin: 0;
  color: #8b869a;
  font-size: 13px;
}
</style>