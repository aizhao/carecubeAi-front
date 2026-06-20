<template>
  <div class="search-container">
    <iframe
      src="http://10.10.18.9:60000/search/share?shared_id=eb4b0dd8688c11f1b7a4edf71643dd02&from=search&auth=NZB9STisikgq3xUyWEnktImWsRaAWiov&tenantId=6a5762a8438e11f1b6e44b01962fc173"
      class="search-iframe"
      frameborder="0"
    />
  </div>
</template>

<script setup>
// AI Search — embedded iframe
</script>

<style lang="scss" scoped>
.search-container {
  width: 100%;
  height: calc(100vh - var(--navbar-height, 44px) - var(--tags-height, 36px) - 48px);
  padding: 24px;

  .search-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
  }
}
</style>
