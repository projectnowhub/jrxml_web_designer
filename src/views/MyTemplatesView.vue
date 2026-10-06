<template>
  <section class="my-templates-view">
    <span class="eyebrow">{{ $t("pages.workspace") }}</span>
    <h1>{{ $t("pages.myTemplates") }}</h1>
    <p>{{ $t("pages.myTemplatesDescription") }}</p>
  </section>
</template>

<style scoped>
.my-templates-view {
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