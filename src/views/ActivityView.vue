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
</style>