# UI Framework Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the global framework shell (sidebar, navbar, tags-view, layout, settings) following Apple Design language tokens from DESIGN.md. Dark mode preserved.

**Architecture:** Overwrite SCSS variables with Apple Design tokens (#0066cc primary, Parchment #f5f5f7 shell, Ink #1d1d1f text). Remove navType/sideTheme variants. Simplify settings store and TagsView to single unified style. Keep `html.dark` dark mode but reduce its CSS to essentials.

**Tech Stack:** Vue 3, Vite, Element Plus, Pinia, SCSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/settings.js` | Modify | Simplify defaults (remove sideTheme, navType, tagsIcon, tagsViewStyle, tagsViewPersist, dynamicTitle) |
| `src/store/modules/settings.js` | Modify | Remove sideTheme/navType/tagsViewStyle/tagsIcon state; keep isDark toggle |
| `src/assets/styles/variables.module.scss` | Rewrite | Apple Design tokens, minimal dark mode block |
| `src/assets/styles/sidebar.scss` | Rewrite | New Parchment sidebar, unified style |
| `src/layout/index.vue` | Modify | Remove navType CSS vars, simplify |
| `src/layout/components/Sidebar/index.vue` | Modify | Remove sideTheme class binding |
| `src/layout/components/Sidebar/SidebarItem.vue` | Verify | No changes needed (reads meta.icon) |
| `src/layout/components/Sidebar/Logo.vue` | No change | Already updated in prior work |
| `src/layout/components/Navbar.vue` | Modify | Height 44px, remove TopNav/TopBar/breadcrumb type logic, update colors |
| `src/layout/components/TagsView/index.vue` | Modify | Single unified style, no card/chrome split |
| `src/layout/components/Settings/index.vue` | Rewrite | Simplified panel: theme color + 5 toggles only |
| `src/layout/components/AppMain.vue` | Modify | New navbar=44px, tags=36px height calcs |
| `src/utils/theme.js` | No change | Keep existing color generation logic |

---

### Task 1: Simplify `src/settings.js`

**File:** Modify `src/settings.js`

- [ ] **Step 1: Replace settings.js content**

```javascript
export default {
  title: import.meta.env.VITE_APP_TITLE,
  showSettings: true,
  tagsView: true,
  fixedHeader: true,
  sidebarLogo: true,
  footerVisible: false,
  footerContent: 'Copyright © 2018-2026 RuoYi. All Rights Reserved.'
}
```

- [ ] **Step 2: Verify no import errors**

Run: `grep -r "sideTheme\|navType\|tagsIcon\|tagsViewStyle\|tagsViewPersist\|dynamicTitle" src/store/modules/settings.js src/layout/`

Expected: Only matches in settings.js store (which we update next) and in the old props we're removing.

---

### Task 2: Simplify `src/store/modules/settings.js`

**File:** Modify `src/store/modules/settings.js`

- [ ] **Step 1: Rewrite the store**

```javascript
import defaultSettings from '@/settings'
import { useDark, useToggle } from '@vueuse/core'
import { handleThemeStyle } from '@/utils/theme'

const isDark = useDark()
const toggleDark = useToggle(isDark)

const { showSettings, tagsView, fixedHeader, sidebarLogo, footerVisible, footerContent } = defaultSettings

const storageSetting = JSON.parse(localStorage.getItem('layout-setting')) || ''

const useSettingsStore = defineStore(
  'settings',
  {
    state: () => ({
      title: '',
      theme: storageSetting.theme || '#0066cc',
      showSettings: showSettings,
      tagsView: storageSetting.tagsView === undefined ? tagsView : storageSetting.tagsView,
      fixedHeader: storageSetting.fixedHeader === undefined ? fixedHeader : storageSetting.fixedHeader,
      sidebarLogo: storageSetting.sidebarLogo === undefined ? sidebarLogo : storageSetting.sidebarLogo,
      footerVisible: storageSetting.footerVisible === undefined ? footerVisible : storageSetting.footerVisible,
      footerContent: footerContent,
      isDark: isDark.value
    }),
    actions: {
      changeSetting(data) {
        const { key, value } = data
        if (this.hasOwnProperty(key)) {
          this[key] = value
        }
      },
      setTitle(title) {
        this.title = title
      },
      toggleTheme() {
        this.isDark = !this.isDark
        toggleDark()
        nextTick(() => {
          handleThemeStyle(this.theme)
        })
      }
    }
  })

export default useSettingsStore
```

- [ ] **Step 2: Check for references to removed properties**

Run: `grep -r "sideTheme\|navType\|tagsViewStyle\|tagsIcon\|tagsViewPersist\|dynamicTitle" src/ --include="*.vue" --include="*.js" | grep -v node_modules | grep -v ".git"`

Expected: Only matches in files we will update (Settings/index.vue, TagsView/index.vue, layout/index.vue, Navbar.vue).

---

### Task 3: Rewrite `src/assets/styles/variables.module.scss`

**File:** Rewrite `src/assets/styles/variables.module.scss`

- [ ] **Step 1: Write new token file**

```scss
// ========== Apple Design Tokens ==========
// Reference: DESIGN.md

// --- Brand ---
$primary: #0066cc;
$primary-focus: #0071e3;
$primary-on-dark: #2997ff;

// --- Surface ---
$canvas: #ffffff;
$parchment: #f5f5f7;
$surface-pearl: #fafafc;

// --- Text ---
$ink: #1d1d1f;
$ink-muted-80: #333333;
$ink-muted-48: #7a7a7a;

// --- Divider ---
$hairline: #e0e0e0;
$divider-soft: #f0f0f0;

// --- Legacy aliases (for backward compat in non-shell code) ---
$blue: $ink;
$light-blue: #3a3a3c;
$red: #C03639;
$pink: #E65D6E;
$green: #30B08F;
$tiffany: #4AB7BD;
$yellow: #FEC171;
$panGreen: #30B08F;

// --- Sidebar (unified Parchment) ---
$menuBg: $parchment;
$menuText: $ink;
$menuActiveText: $primary;
$menuHover: rgba(0, 0, 0, 0.04);

$menuLightBg: $parchment;
$menuLightHover: rgba(0, 0, 0, 0.04);
$menuLightText: $ink;
$menuLightActiveText: $primary;

$base-sidebar-width: 220px;
$sideBarWidth: 220px;

// --- Legacy dark menu vars (kept for export only, not used in new shell) ---
$base-menu-color: rgba(255, 255, 255, 0.65);
$base-menu-color-active: #ffffff;
$base-menu-background: #141414;
$base-sub-menu-background: #1a1a1a;
$base-sub-menu-hover: rgba(255, 255, 255, 0.06);

// --- Component colors ---
$--color-primary: $primary;
$--color-success: #30B08F;
$--color-warning: #E6A23C;
$--color-danger: #F56C6C;
$--color-info: #909399;

// --- Export for JS access ---
:export {
  menuBg: $menuBg;
  menuText: $menuText;
  menuActiveText: $menuActiveText;
  menuHover: $menuHover;
  menuLightBg: $menuLightBg;
  menuLightHover: $menuLightHover;
  menuLightText: $menuLightText;
  menuLightActiveText: $menuLightActiveText;
  sideBarWidth: $sideBarWidth;
  blue: $blue;
  lightBlue: $light-blue;
  red: $red;
  pink: $pink;
  green: $green;
  tiffany: $tiffany;
  yellow: $yellow;
  panGreen: $panGreen;
  colorPrimary: $--color-primary;
  colorSuccess: $--color-success;
  colorWarning: $--color-warning;
  colorDanger: $--color-danger;
  colorInfo: $--color-info;
}

// ========== CSS Custom Properties ==========

:root {
  --sidebar-bg: #{$parchment};
  --sidebar-text: #{$ink};
  --menu-hover: #{$menuHover};
  --navbar-bg: #{$parchment};
  --navbar-text: #{$ink};
  --navbar-height: 44px;
  --tags-height: 36px;
  --splitpanes-default-bg: #{$canvas};
}

// ========== Dark Mode ==========
html.dark {
  --sidebar-bg: #141414;
  --sidebar-text: #ffffff;
  --menu-hover: #2d2d2d;
  --menu-active-text: #{$primary-on-dark};

  --navbar-bg: #141414;
  --navbar-text: #ffffff;
  --navbar-hover: #141414;

  --tags-bg: #141414;
  --tags-item-bg: #1d1e1f;
  --tags-item-border: #303030;
  --tags-item-text: #d0d0d0;
  --tags-item-hover: #2d2d2d;
  --tags-close-hover: #64666a;
  --tags-card-active-bg: #1d1e1f;
  --tags-active-indicator: #{$primary-on-dark};

  --splitpanes-bg: #141414;
  --splitpanes-border: #303030;
  --splitpanes-splitter-bg: #1d1e1f;
  --splitpanes-splitter-hover-bg: #2d2d2d;
  --splitpanes-default-bg: #141414;

  --blockquote-bg: #1d1e1f;
  --blockquote-border: #303030;
  --blockquote-text: #d0d0d0;
  --cron-border: #303030;

  --el-bg-color: #141414;
  --el-bg-color-overlay: #1d1e1f;
  --el-text-color-primary: #ffffff;
  --el-text-color-regular: #d0d0d0;
  --el-border-color: #434343;

  --primary-bg: #18212b;
  --sidebar-logo-text: #d0d0d0;

  // Sidebar dark mode overrides
  .sidebar-container {
    .el-menu-item:not(.is-active), .menu-title {
      color: var(--el-text-color-regular);
    }
    & .nest-menu .el-sub-menu>.el-sub-menu__title,
    & .el-sub-menu .el-menu-item {
      background-color: var(--el-bg-color) !important;
      &:hover { background-color: var(--menu-hover) !important; }
    }
  }

  // Table overrides
  .el-table {
    --el-table-header-bg-color: var(--el-bg-color-overlay) !important;
    --el-table-header-text-color: var(--el-text-color-regular) !important;
    --el-table-border-color: var(--el-border-color) !important;
    --el-table-row-hover-bg-color: var(--el-bg-color-overlay) !important;
  }

  // Tree overrides
  .el-tree {
    .el-tree-node.is-current > .el-tree-node__content {
      background-color: var(--el-bg-color-overlay) !important;
      color: var(--el-color-primary);
    }
  }

  // Dropdown overrides
  .el-dropdown-menu__item:not(.is-disabled):focus,
  .el-dropdown-menu__item:not(.is-disabled):hover {
    background-color: var(--navbar-hover) !important;
  }

  // Button overrides
  .el-button--primary.is-plain {
    background-color: var(--primary-bg);
    border-color: var(--el-color-primary-light-2);
    color: var(--el-color-primary-light-2);
  }

  // Tag overrides
  .el-tag--primary {
    background-color: var(--primary-bg);
    border-color: var(--el-border-color);
    color: var(--el-color-primary);
  }

  // Blockquote
  blockquote {
    background-color: var(--blockquote-bg) !important;
    border-left-color: var(--blockquote-border) !important;
    color: var(--blockquote-text) !important;
  }

  // Copyright
  .copyright {
    background-color: var(--el-bg-color) !important;
    color: var(--el-text-color-regular) !important;
    border-top: 1px solid var(--el-bg-color) !important;
  }
}
```

---

### Task 4: Rewrite `src/assets/styles/sidebar.scss`

**File:** Rewrite `src/assets/styles/sidebar.scss`

- [ ] **Step 1: Write new sidebar styles**

```scss
@use './variables.module.scss' as vars;

#app {
  .main-container {
    min-height: 100%;
    transition: margin-left 0.2s ease;
    margin-left: vars.$base-sidebar-width;
    position: relative;
    background: var(--sidebar-bg, #{vars.$parchment});
  }

  .sidebarHide {
    margin-left: 0 !important;
  }

  .sidebar-container {
    transition: width 0.2s ease;
    width: vars.$base-sidebar-width !important;
    height: 100%;
    position: fixed;
    font-size: 0px;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1001;
    overflow: hidden;
    background: var(--sidebar-bg, #{vars.$parchment});
    border-right: 1px solid vars.$hairline;

    .horizontal-collapse-transition {
      transition: 0s width ease-in-out, 0s padding-left ease-in-out, 0s padding-right ease-in-out;
    }

    .scrollbar-wrapper {
      overflow-x: hidden !important;
    }

    .el-scrollbar__bar.is-vertical { right: 0px; }
    .el-scrollbar { height: 100%; }

    &.has-logo .el-scrollbar {
      height: calc(100% - 52px);
    }

    .is-horizontal { display: none; }

    a {
      display: inline-block;
      width: 100%;
      overflow: hidden;
    }

    .svg-icon {
      margin-right: 10px !important;
    }

    .el-menu {
      border: none;
      height: 100%;
      width: 100% !important;
    }

    .el-menu-item, .menu-title {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      height: 44px !important;
      line-height: 44px !important;
    }

    .el-menu-item .el-menu-tooltip__trigger {
      display: inline-block !important;
    }

    // --- Menu item hover ---
    .sub-menu-title-noDropdown,
    .el-sub-menu__title {
      &:hover {
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.04));
      }
    }

    // --- Active menu item: white card + left blue bar ---
    .el-menu-item.is-active {
      background: #ffffff !important;
      color: vars.$primary !important;
      border-left: 3px solid vars.$primary;
      margin: 2px 0;
      border-radius: 0 8px 8px 0;
      margin-right: 8px;
    }

    // --- Active submenu parent ---
    .is-active > .el-sub-menu__title {
      color: vars.$primary !important;
    }

    // --- Nested menus ---
    & .nest-menu .el-sub-menu>.el-sub-menu__title,
    & .el-sub-menu .el-menu-item {
      min-width: vars.$base-sidebar-width !important;
      &:hover {
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.04));
      }
    }
  }

  // --- Collapsed sidebar ---
  .hideSidebar {
    .sidebar-container { width: 64px !important; }
    .main-container { margin-left: 64px; }

    .sub-menu-title-noDropdown {
      padding: 0 !important;
      position: relative;
      .el-tooltip {
        padding: 0 !important;
        .svg-icon { margin-left: 22px; }
      }
    }

    .el-sub-menu {
      overflow: hidden;
      &>.el-sub-menu__title {
        padding: 0 !important;
        .svg-icon { margin-left: 22px; }
      }
    }

    .el-menu--collapse .el-sub-menu > .el-sub-menu__title {
      &>span, &>i {
        height: 0; width: 0; overflow: hidden; visibility: hidden; display: inline-block;
      }
    }
  }

  .el-menu--collapse .el-menu .el-sub-menu {
    min-width: vars.$base-sidebar-width !important;
  }

  // --- Mobile ---
  .mobile {
    .main-container { margin-left: 0px; }
    .sidebar-container {
      transition: transform .28s;
      width: vars.$base-sidebar-width !important;
    }
    &.hideSidebar .sidebar-container {
      pointer-events: none;
      transition-duration: 0.3s;
      transform: translate3d(-(vars.$base-sidebar-width), 0, 0);
    }
  }

  .withoutAnimation {
    .main-container, .sidebar-container { transition: none; }
  }
}

// --- Popup menu (collapsed mode) ---
.el-menu--vertical {
  &>.el-menu {
    .svg-icon { margin-right: 16px; }
  }

  .nest-menu .el-sub-menu>.el-sub-menu__title,
  .el-menu-item {
    &:hover { background-color: rgba(0, 0, 0, 0.06) !important; }
  }

  >.el-menu--popup {
    max-height: 100vh;
    overflow-y: auto;

    &::-webkit-scrollbar-track-piece { background: #d3dce6; }
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #99a9bf; border-radius: 20px; }
  }
}
```

---

### Task 5: Update `src/layout/index.vue`

**File:** Modify `src/layout/index.vue`

- [ ] **Step 1: Replace the template — remove CSS var injection, simplify**

```vue
<template>
  <div :class="classObj" class="app-wrapper">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside"/>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" />
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide }" class="main-container">
      <div :class="{ 'fixed-header': fixedHeader }">
        <navbar @setLayout="setLayout" />
        <tags-view v-if="needTagsView" />
      </div>
      <app-main />
      <settings ref="settingRef" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Replace the script — remove theme CSS var**

```vue
<script setup>
import { useWindowSize } from '@vueuse/core'
import Sidebar from './components/Sidebar/index.vue'
import { AppMain, Navbar, Settings, TagsView } from './components'
import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'

const settingsStore = useSettingsStore()
const sidebar = computed(() => useAppStore().sidebar)
const device = computed(() => useAppStore().device)
const needTagsView = computed(() => settingsStore.tagsView)
const fixedHeader = computed(() => settingsStore.fixedHeader)

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened,
  openSidebar: sidebar.value.opened,
  withoutAnimation: sidebar.value.withoutAnimation,
  mobile: device.value === 'mobile'
}))

const { width } = useWindowSize()
const WIDTH = 992

watch(() => device.value, () => {
  if (device.value === 'mobile' && sidebar.value.opened) {
    useAppStore().closeSideBar({ withoutAnimation: false })
  }
})

watchEffect(() => {
  if (width.value - 1 < WIDTH) {
    useAppStore().toggleDevice('mobile')
    useAppStore().closeSideBar({ withoutAnimation: true })
  } else {
    useAppStore().toggleDevice('desktop')
  }
})

function handleClickOutside() {
  useAppStore().closeSideBar({ withoutAnimation: false })
}

const settingRef = ref(null)
function setLayout() {
  settingRef.value.openSetting()
}
</script>
```

- [ ] **Step 3: Update the style — new sidebar width**

```scss
<style lang="scss" scoped>
@use "@/assets/styles/mixin.scss" as mix;
@use "@/assets/styles/variables.module.scss" as vars;

.app-wrapper {
  @include mix.clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.main-container:has(.fixed-header) {
  height: 100vh;
  overflow: hidden;
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - #{vars.$base-sidebar-width});
  transition: width 0.2s;
}

.hideSidebar .fixed-header {
  width: calc(100% - 64px);
}

.sidebarHide .fixed-header {
  width: 100%;
}

.mobile .fixed-header {
  width: 100%;
}
</style>
```

---

### Task 6: Update `src/layout/components/Sidebar/index.vue`

**File:** Modify `src/layout/components/Sidebar/index.vue`

- [ ] **Step 1: Replace template — remove sideTheme class**

```vue
<template>
  <div :class="{'has-logo': showLogo}" class="sidebar-container">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="getMenuBackground"
        :text-color="getMenuTextColor"
        :unique-opened="true"
        :active-text-color="theme"
        :collapse-transition="false"
        mode="vertical"
      >
        <sidebar-item
          v-for="(route, index) in sidebarRouters"
          :key="route.path + index"
          :item="route"
          :base-path="route.path"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>
```

- [ ] **Step 2: Replace script — remove sideTheme logic**

```vue
<script setup>
import Logo from './Logo'
import SidebarItem from './SidebarItem'
import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'

const route = useRoute()
const appStore = useAppStore()
const settingsStore = useSettingsStore()
const permissionStore = usePermissionStore()

const sidebarRouters = computed(() => permissionStore.sidebarRouters)
const showLogo = computed(() => settingsStore.sidebarLogo)
const theme = computed(() => settingsStore.theme)
const isCollapse = computed(() => !appStore.sidebar.opened)

const getMenuBackground = computed(() => {
  return settingsStore.isDark ? 'var(--sidebar-bg)' : '#f5f5f7'
})

const getMenuTextColor = computed(() => {
  return settingsStore.isDark ? 'var(--sidebar-text)' : '#1d1d1f'
})

const activeMenu = computed(() => {
  const { meta, path } = route
  if (meta.activeMenu) return meta.activeMenu
  return path
})
</script>
```

- [ ] **Step 3: Replace style**

```scss
<style lang="scss" scoped>
.sidebar-container {
  background-color: v-bind(getMenuBackground);

  .scrollbar-wrapper {
    background-color: v-bind(getMenuBackground);
  }

  .el-menu {
    border: none;
    height: 100%;
    width: 100% !important;

    .el-menu-item, .el-sub-menu__title {
      &:hover {
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.04)) !important;
      }
    }

    .el-menu-item {
      color: v-bind(getMenuTextColor);
    }

    .el-sub-menu__title {
      color: v-bind(getMenuTextColor);
    }
  }
}
</style>
```

---

### Task 7: Update `src/layout/components/Navbar.vue`

**File:** Modify `src/layout/components/Navbar.vue`

- [ ] **Step 1: Replace template — remove TopNav/TopBar, simplify to single mode**

Replace the current template with:

```vue
<template>
  <div class="navbar">
    <hamburger id="hamburger-container" :is-active="appStore.sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />
    <breadcrumb id="breadcrumb-container" class="breadcrumb-container" />

    <div class="right-menu">
      <template v-if="appStore.device !== 'mobile'">
        <header-search id="header-search" class="right-menu-item" />

        <div class="right-menu-item hover-effect theme-switch-wrapper" title="暗黑模式" @click="toggleTheme">
          <svg-icon v-if="settingsStore.isDark" icon-class="sunny" />
          <svg-icon v-if="!settingsStore.isDark" icon-class="moon" />
        </div>

        <screenfull id="screenfull" class="right-menu-item hover-effect" />

        <header-notice id="header-notice" class="right-menu-item hover-effect" />
      </template>

      <el-dropdown @command="handleCommand" class="avatar-container right-menu-item hover-effect" trigger="hover">
        <div class="avatar-wrapper">
          <img :src="userStore.avatar" class="user-avatar" />
          <span class="user-nickname">{{ userStore.nickName }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <router-link to="/user/profile">
              <el-dropdown-item>个人中心</el-dropdown-item>
            </router-link>
            <el-dropdown-item command="setLayout" v-if="settingsStore.showSettings">
              <span>布局设置</span>
            </el-dropdown-item>
            <el-dropdown-item command="lockScreen">
              <span>锁定屏幕</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Replace script — remove TopNav/TopBar imports and navType logic**

```vue
<script setup>
import { ElMessageBox } from 'element-plus'
import Breadcrumb from '@/components/Breadcrumb'
import Logo from './Sidebar/Logo'
import Hamburger from '@/components/Hamburger'
import Screenfull from '@/components/Screenfull'
import HeaderSearch from '@/components/HeaderSearch'
import useAppStore from '@/store/modules/app'
import useUserStore from '@/store/modules/user'
import useLockStore from '@/store/modules/lock'
import useSettingsStore from '@/store/modules/settings'
import HeaderNotice from './HeaderNotice'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const lockStore = useLockStore()
const settingsStore = useSettingsStore()

function toggleSideBar() {
  appStore.toggleSideBar()
}

function handleCommand(command) {
  switch (command) {
    case "setLayout": setLayout(); break
    case "lockScreen": lockScreen(); break
    case "logout": logout(); break
  }
}

function logout() {
  ElMessageBox.confirm('确定注销并退出系统吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logOut().then(() => {
      location.href = '/index'
    })
  }).catch(() => { })
}

const emits = defineEmits(['setLayout'])
function setLayout() { emits('setLayout') }

function lockScreen() {
  const currentPath = route.fullPath
  lockStore.lockScreen(currentPath)
  router.push('/lock')
}

async function toggleTheme(event) {
  const x = event?.clientX || window.innerWidth / 2
  const y = event?.clientY || window.innerHeight / 2
  const wasDark = settingsStore.isDark

  const isSupported = document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!isSupported) {
    settingsStore.toggleTheme()
    return
  }

  try {
    const transition = document.startViewTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      settingsStore.toggleTheme()
      await nextTick()
    })
    await transition.ready
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
    document.documentElement.animate(
      {
        clipPath: !wasDark ? [...clipPath].reverse() : clipPath
      }, {
        duration: 650,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
        pseudoElement: !wasDark ? "::view-transition-old(root)" : "::view-transition-new(root)"
      }
    )
    await transition.finished
  } catch (error) {
    settingsStore.toggleTheme()
  }
}
</script>
```

- [ ] **Step 3: Replace style — new height, Parchment colors, no shadow**

```scss
<style lang='scss' scoped>
.navbar {
  height: var(--navbar-height, 44px);
  overflow: hidden;
  position: relative;
  background: var(--navbar-bg, #f5f5f7);
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;

  .hamburger-container {
    line-height: 44px;
    height: 100%;
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 8px;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  .breadcrumb-container {
    flex-shrink: 0;
  }

  .right-menu {
    height: 100%;
    line-height: 44px;
    display: flex;
    align-items: center;
    margin-left: auto;

    .right-menu-item {
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #333333;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background 0.15s;
        &:hover { background: rgba(0, 0, 0, 0.04); }
      }

      &.theme-switch-wrapper {
        svg {
          transition: transform 0.3s;
          &:hover { transform: scale(1.15); }
        }
      }
    }

    .avatar-container {
      margin-right: 4px;
      .avatar-wrapper {
        margin-top: 7px;
        position: relative;
        .user-avatar {
          cursor: pointer;
          width: 28px;
          height: 28px;
          margin-right: 6px;
          border-radius: 50%;
        }
        .user-nickname {
          position: relative;
          top: -10px;
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
        }
      }
    }
  }
}
</style>
```

---

### Task 8: Update `src/layout/components/TagsView/index.vue`

**File:** Modify `src/layout/components/TagsView/index.vue`

Since the TagsView component is large (~700 lines), we do targeted edits rather than a full rewrite.

- [ ] **Step 1: Remove `tagsIcon` and `tagsViewStyle` from state/computed**

Remove lines referencing `tagsIcon` and `tagsViewStyle`:

In the `<script setup>`, remove:
```javascript
const tagsIcon = computed(() => useSettingsStore().tagsIcon)
const tagsViewStyle = computed(() => useSettingsStore().tagsViewStyle)
```

- [ ] **Step 2: Remove tagsViewStyle class binding on root**

Change:
```html
<div id="tags-view-container" class="tags-view-container" :class="{ 'tags-view-container--chrome': tagsViewStyle === 'chrome' }">
```
To:
```html
<div id="tags-view-container" class="tags-view-container">
```

- [ ] **Step 3: Remove SVG icon rendering in tags**

Change:
```html
<svg-icon v-if="tagsIcon && tag.meta && tag.meta.icon && tag.meta.icon !== '#'" :icon-class="tag.meta.icon" style="margin-right: 3px;" />
```
To: (remove this line entirely)

- [ ] **Step 4: Update `tagActiveStyle()` to remove card-style background**

Change:
```javascript
function tagActiveStyle(tag) {
  if (!isActive(tag) || tagsViewStyle.value !== 'card') return {}
  return {
    'background-color': theme.value,
    'border-color': theme.value
  }
}
```
To:
```javascript
function tagActiveStyle(_tag) {
  return {}
}
```

- [ ] **Step 5: Replace the scoped style with unified Apple-style tags**

Replace the entire `<style lang="scss" scoped>` block:

```scss
<style lang="scss" scoped>
$tags-bar-height: 36px;

.tags-view-container {
  height: $tags-bar-height;
  width: 100%;
  background: var(--tags-bg, #f5f5f7);
  border-bottom: 1px solid var(--tags-item-border, #e0e0e0);
  display: flex;
  align-items: center;
  overflow: hidden;

  $btn-width: 28px;
  $btn-color: #7a7a7a;
  $btn-hover-bg: rgba(0, 0, 0, 0.04);
  $btn-hover-color: #1d1d1f;
  $btn-disabled-color: #d0d0d0;

  .tags-nav-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: $btn-width;
    height: $tags-bar-height;
    cursor: pointer;
    color: $btn-color;
    font-size: 13px;
    user-select: none;
    transition: background 0.15s, color 0.15s;

    &:hover:not(.disabled) {
      background: $btn-hover-bg;
      color: $btn-hover-color;
    }
    &.disabled {
      color: $btn-disabled-color;
      cursor: not-allowed;
    }

    &--left  { border-right: 1px solid var(--tags-item-border, #e0e0e0); }
    &--right { border-left: 1px solid var(--tags-item-border, #e0e0e0); }
  }

  .tags-view-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;

    .tags-view-item {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      height: 28px;
      line-height: 28px;
      border: none;
      color: var(--tags-item-text, #7a7a7a);
      background: transparent;
      padding: 0 10px;
      font-size: 13px;
      margin-left: 2px;
      border-radius: 8px 8px 0 0;
      text-decoration: none;
      vertical-align: middle;

      &:first-of-type { margin-left: 6px; }
      &:last-of-type  { margin-right: 15px; }

      &:hover:not(.active) {
        background: rgba(0, 0, 0, 0.04);
        color: #1d1d1f;
      }

      &.active {
        background: #ffffff;
        color: #1d1d1f;
        box-shadow: 0 0 0 1px #e0e0e0;
        border-bottom: 2px solid #0066cc;
      }
    }
  }

  .tags-action-dropdown {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .tags-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: $btn-width;
    height: $tags-bar-height;
    cursor: pointer;
    color: $btn-color;
    font-size: 13px;
    border-left: 1px solid var(--tags-item-border, #e0e0e0);
    user-select: none;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: $btn-hover-bg;
      color: $btn-hover-color;
    }
  }

  .tags-refresh-btn {
    width: 60px;
  }

  .contextmenu {
    margin: 0;
    background: var(--el-bg-color-overlay, #fff);
    z-index: 3000;
    position: fixed;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
    color: var(--tags-item-text, #333);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--el-border-color-light, #e4e7ed);

    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      &:hover { background: var(--tags-item-hover, #f5f5f7); }
    }
  }
}
</style>
```

- [ ] **Step 6: Remove chrome-style close button hover from the non-scoped style**

In the `<style lang="scss">` block:
- Remove the `tags-view-container--chrome` styles (they're now unused)
- Keep the `.tags-close-btn` and `.fullscreen-mode` styles but update colors

```scss
<style lang="scss">
.tags-view-wrapper {
  .tags-view-item {
    .tags-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: 4px;
      border-radius: 50%;
      transition: all 0.15s ease;
      cursor: pointer;
      opacity: 0;

      .el-icon-close {
        width: 1em;
        height: 1em;
        vertical-align: 0;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }

    &:hover .tags-close-btn {
      opacity: 1;
    }
  }
}

.tags-view-item.active .tags-close-btn {
  opacity: 1;
}

.tags-close-btn:hover {
  background-color: #999999;
  .el-icon-close { color: #fff; }
}

.main-container.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  margin-left: 0 !important;
  transition: none !important;
}

.main-container.fullscreen-mode .fixed-header {
  display: block !important;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100% !important;
  z-index: 1000;
  transition: none !important;
}

.main-container.fullscreen-mode .fixed-header .navbar {
  display: none !important;
}

.main-container.fullscreen-mode .app-main {
  position: fixed;
  top: 36px;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0 !important;
  padding: 0 !important;
  height: calc(100vh - 36px) !important;
  min-height: calc(100vh - 36px) !important;
  overflow: auto;
}
</style>
```

---

### Task 9: Simplify `src/layout/components/Settings/index.vue`

**File:** Rewrite `src/layout/components/Settings/index.vue`

- [ ] **Step 1: Write simplified settings panel**

```vue
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
```

---

### Task 10: Update `src/layout/components/AppMain.vue` height calculations

**File:** Modify `src/layout/components/AppMain.vue`

- [ ] **Step 1: Replace the scoped style block**

```scss
<style lang="scss" scoped>
.app-main {
  min-height: calc(100vh - var(--navbar-height, 44px));
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.fixed-header + .app-main {
  overflow-y: auto;
  scrollbar-gutter: auto;
  height: calc(100vh - var(--navbar-height, 44px));
  min-height: 0px;
}

.app-main:has(.copyright) {
  padding-bottom: 36px;
}

.fixed-header + .app-main {
  margin-top: var(--navbar-height, 44px);
}

.hasTagsView {
  .app-main {
    min-height: calc(100vh - var(--navbar-height, 44px) - var(--tags-height, 36px));
  }

  .fixed-header + .app-main {
    margin-top: calc(var(--navbar-height, 44px) + var(--tags-height, 36px));
    height: calc(100vh - var(--navbar-height, 44px) - var(--tags-height, 36px));
    min-height: 0px;
  }
}

/* 移动端fixed-header优化 */
@media screen and (max-width: 991px) {
  .fixed-header + .app-main {
    padding-bottom: max(60px, calc(constant(safe-area-inset-bottom) + 40px));
    padding-bottom: max(60px, calc(env(safe-area-inset-bottom) + 40px));
    overscroll-behavior-y: none;
  }

  .hasTagsView .fixed-header + .app-main {
    padding-bottom: max(60px, calc(constant(safe-area-inset-bottom) + 40px));
    padding-bottom: max(60px, calc(env(safe-area-inset-bottom) + 40px));
    overscroll-behavior-y: none;
  }
}

@supports (-webkit-touch-callout: none) {
  @media screen and (max-width: 991px) {
    .fixed-header + .app-main {
      padding-bottom: max(17px, calc(constant(safe-area-inset-bottom) + 10px));
      padding-bottom: max(17px, calc(env(safe-area-inset-bottom) + 10px));
      height: calc(100svh - var(--navbar-height, 44px));
      height: calc(100dvh - var(--navbar-height, 44px));
    }

    .hasTagsView .fixed-header + .app-main {
      padding-bottom: max(17px, calc(constant(safe-area-inset-bottom) + 10px));
      padding-bottom: max(17px, calc(env(safe-area-inset-bottom) + 10px));
      height: calc(100svh - var(--navbar-height, 44px) - var(--tags-height, 36px));
      height: calc(100dvh - var(--navbar-height, 44px) - var(--tags-height, 36px));
    }
  }
}
</style>
```

- [ ] **Step 2: Update scrollbar style**

```scss
<style lang="scss">
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background-color: #f5f5f7;
}

::-webkit-scrollbar-thumb {
  background-color: #d2d2d7;
  border-radius: 3px;
}
</style>
```

---

### Task 11: Update `src/assets/styles/index.scss`

**File:** Modify `src/assets/styles/index.scss`

- [ ] **Step 1: Update body background and typography**

Read the current file, then update `body` styling:

```scss
body {
  height: 100%;
  font-family: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 17px;
  color: #1d1d1f;
  background: #f5f5f7;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

---

### Task 12: Update `src/layout/components/Sidebar/Logo.vue` height

**File:** Modify `src/layout/components/Sidebar/Logo.vue`

- [ ] **Step 1: Update logo container height from 50px to 52px**

Change `.sidebar-logo-container` height and line-height:
```scss
.sidebar-logo-container {
  height: 52px;
  line-height: 52px;
}
```
And `.sidebar-title` line-height:
```scss
.sidebar-title {
  line-height: 52px;
}
```

---

### Task 13: Final Verification

- [ ] **Step 1: Restart frontend dev server**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue3
yarn dev
```

- [ ] **Step 2: Visual check**

Open browser at `http://localhost:80`, log in, verify:
- Sidebar is Parchment (`#f5f5f7`) background with 1px hairline border-right
- Active menu item has white card bg + left 3px blue bar
- Navbar is 44px tall, Parchment bg, bottom hairline
- Tags are unified style with blue bottom-indicator on active
- Dark mode toggle works (moon/sun icon)
- Settings panel shows only theme color + 4 toggles
- Collapse sidebar works (64px wide)
