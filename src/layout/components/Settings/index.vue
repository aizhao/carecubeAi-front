<template>
  <el-drawer v-model="showSettings" :withHeader="false" :lock-scroll="false" direction="rtl" size="280px">
    <div class="setting-drawer-title">
      <h3 class="drawer-title">主题设置</h3>
    </div>

    <div class="drawer-item">
      <span>主题颜色</span>
      <span class="comp-style">
        <el-color-picker v-model="theme" :predefine="predefineColors" @change="themeChange"/>
      </span>
    </div>

    <el-divider />
    <h3 class="drawer-title">布局配置</h3>

    <div class="drawer-item">
      <span>显示标签页</span>
      <span class="comp-style">
        <el-switch v-model="settingsStore.tagsView" class="drawer-switch" />
      </span>
    </div>

    <div class="drawer-item">
      <span>固定头部</span>
      <span class="comp-style">
        <el-switch v-model="settingsStore.fixedHeader" class="drawer-switch" />
      </span>
    </div>

    <div class="drawer-item">
      <span>显示 Logo</span>
      <span class="comp-style">
        <el-switch v-model="settingsStore.sidebarLogo" class="drawer-switch" />
      </span>
    </div>

    <div class="drawer-item">
      <span>底部版权</span>
      <span class="comp-style">
        <el-switch v-model="settingsStore.footerVisible" class="drawer-switch" />
      </span>
    </div>

    <el-divider />

    <el-button type="primary" plain @click="saveSetting">保存配置</el-button>
    <el-button plain @click="resetSetting">重置配置</el-button>
  </el-drawer>
</template>

<script setup>
import useSettingsStore from '@/store/modules/settings'
import { handleThemeStyle } from '@/utils/theme'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const showSettings = ref(false)
const theme = ref(settingsStore.theme)
const predefineColors = ref(["#0066cc", "#0071e3", "#2997ff", "#1d1d1f", "#30B08F", "#E6A23C", "#F56C6C", "#909399"])

function themeChange(val) {
  settingsStore.theme = val
  handleThemeStyle(val)
}

function saveSetting() {
  proxy.$modal.loading("正在保存到本地，请稍候...")
  let layoutSetting = {
    "tagsView": settingsStore.tagsView,
    "fixedHeader": settingsStore.fixedHeader,
    "sidebarLogo": settingsStore.sidebarLogo,
    "footerVisible": settingsStore.footerVisible,
    "theme": settingsStore.theme
  }
  localStorage.setItem("layout-setting", JSON.stringify(layoutSetting))
  setTimeout(proxy.$modal.closeLoading(), 1000)
}

function resetSetting() {
  proxy.$modal.loading("正在清除设置缓存并刷新，请稍候...")
  localStorage.removeItem("layout-setting")
  setTimeout("window.location.reload()", 1000)
}

function openSetting() {
  showSettings.value = true
}

defineExpose({ openSetting })
</script>

<style lang='scss' scoped>
.setting-drawer-title {
  margin-bottom: 12px;
  color: var(--el-text-color-primary, rgba(0, 0, 0, 0.85));
  line-height: 22px;
  font-weight: bold;

  .drawer-title {
    font-size: 14px;
  }
}

.drawer-item {
  color: var(--el-text-color-regular, rgba(0, 0, 0, 0.65));
  padding: 12px 0;
  font-size: 14px;

  .comp-style {
    float: right;
    margin: -3px 8px 0px 0px;
  }
}
</style>
