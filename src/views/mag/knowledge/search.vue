<template>
  <div class="search-container">
    <iframe
      v-if="searchUrl"
      :src="searchUrl"
      class="search-iframe"
      frameborder="0"
    />
    <el-empty v-else description="请配置 AI 检索地址" />
  </div>
</template>

<script setup>
const searchUrl = import.meta.env.VITE_APP_RAGFLOW_SEARCH_URL || ''
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
