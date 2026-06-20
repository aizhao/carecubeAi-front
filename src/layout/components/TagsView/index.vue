<template>
  <div id="tags-view-container" class="tags-view-container">
    <!-- 左切换箭头 -->
    <span class="tags-nav-btn tags-nav-btn--left" :class="{ disabled: !canScrollLeft }" @click="scrollLeft">
      <el-icon><arrow-left /></el-icon>
    </span>

    <!-- 标签滚动区 -->
    <scroll-pane ref="scrollPaneRef" class="tags-view-wrapper" @scroll="handleScroll" @update-arrows="updateArrowState">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :data-path="tag.path"
        :class="{ 'active': isActive(tag) }"
        :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
        class="tags-view-item"
        :style="tagActiveStyle(tag)"
        @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : ''"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ tag.title }}
        <span v-if="!isAffix(tag)" @click.prevent.stop="closeSelectedTag(tag)" class="tags-close-btn">
          <close class="el-icon-close" />
        </span>
      </router-link>
    </scroll-pane>

    <!-- 右切换箭头 -->
    <span class="tags-nav-btn tags-nav-btn--right" :class="{ disabled: !canScrollRight }" @click="scrollRight">
      <el-icon><arrow-right /></el-icon>
    </span>

    <!-- 下拉操作菜单 -->
    <el-dropdown class="tags-action-dropdown" trigger="click" placement="bottom-end" @command="handleDropdownCommand">
      <span class="tags-action-btn">
        <el-icon><arrow-down /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="tags-dropdown-menu">
          <el-dropdown-item v-if="!isAffix(selectedDropdownTag)" command="close"><close style="width: 1em; height: 1em;" />关闭当前</el-dropdown-item>
          <el-dropdown-item command="closeOthers"><circle-close style="width: 1em; height: 1em;" />关闭其他</el-dropdown-item>
          <el-dropdown-item command="closeLeft" :disabled="isFirstView()"><back style="width: 1em; height: 1em;" />关闭左侧</el-dropdown-item>
          <el-dropdown-item command="closeRight" :disabled="isLastView()"><right style="width: 1em; height: 1em;" />关闭右侧</el-dropdown-item>
          <el-dropdown-item command="closeAll"><circle-close style="width: 1em; height: 1em;" />全部关闭</el-dropdown-item>
          <el-dropdown-item command="fullscreen" divided>
            <template v-if="!isFullscreen"><full-screen style="width: 1em; height: 1em;" />全屏显示</template>
            <template v-else><close style="width: 1em; height: 1em;" />退出全屏</template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 刷新按钮 -->
    <span class="tags-action-btn tags-refresh-btn" title="刷新页面" @click="refreshSelectedTag(selectedDropdownTag)">
      <el-icon><refresh-right/></el-icon> 刷新
    </span>

    <!-- 右键上下文菜单 -->
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)"><refresh-right style="width: 1em; height: 1em;" />刷新页面</li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)"><close style="width: 1em; height: 1em;" />关闭当前</li>
      <li @click="closeOthersTags"><circle-close style="width: 1em; height: 1em;" />关闭其他</li>
      <li v-if="!isFirstView()" @click="closeLeftTags"><back style="width: 1em; height: 1em;" />关闭左侧</li>
      <li v-if="!isLastView()" @click="closeRightTags"><right style="width: 1em; height: 1em;" />关闭右侧</li>
      <li @click="closeAllTags(selectedTag)"><circle-close style="width: 1em; height: 1em;" />全部关闭</li>
    </ul>
  </div>
</template>

<script setup>
import ScrollPane from './ScrollPane'
import { getNormalPath } from '@/utils/ruoyi'
import useTagsViewStore from '@/store/modules/tagsView'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref({})
const affixTags = ref([])
const scrollPaneRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const isFullscreen = ref(false)
const hiddenElements = ref([])

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const visitedViews = computed(() => useTagsViewStore().visitedViews)
const routes = computed(() => usePermissionStore().routes)
const theme = computed(() => useSettingsStore().theme)
// 下拉菜单针对当前激活的 tag
const selectedDropdownTag = computed(() => visitedViews.value.find(v => isActive(v)) || {})

watch(route, () => {
  addTags()
  moveToCurrentTag()
})

watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

watch(visitedViews, () => {
  nextTick(() => updateArrowState())
})

onMounted(() => {
  initTags()
  addTags()
  window.addEventListener('resize', updateArrowState)
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateArrowState)
  window.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(event) {
  // 当按下Esc键且处于全屏状态时，退出全屏
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

function isActive(r) {
  return r.path === route.path
}

function tagActiveStyle(_tag) {
  return {}
}

function isAffix(tag) {
  return tag && tag.meta && tag.meta.affix
}

function isFirstView() {
  try {
    const tag = selectedTag.value && selectedTag.value.fullPath ? selectedTag.value : selectedDropdownTag.value
    return tag.fullPath === '/index' || tag.fullPath === visitedViews.value[1].fullPath
  } catch (err) {
    return false
  }
}

function isLastView() {
  try {
    const tag = selectedTag.value && selectedTag.value.fullPath ? selectedTag.value : selectedDropdownTag.value
    return tag.fullPath === visitedViews.value[visitedViews.value.length - 1].fullPath
  } catch (err) {
    return false
  }
}

function filterAffixTags(routes, basePath = '') {
  let tags = []
  routes.forEach(route => {
    if (route.meta && route.meta.affix) {
      const tagPath = getNormalPath(basePath + '/' + route.path)
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: route.name,
        meta: { ...route.meta }
      })
    }
    if (route.children) {
      const tempTags = filterAffixTags(route.children, route.path)
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags]
      }
    }
  })
  return tags
}

function initTags() {
  useTagsViewStore().loadPersistedViews()
  const res = filterAffixTags(routes.value)
  affixTags.value = res
  for (const tag of res) {
    if (tag.name) {
      useTagsViewStore().addAffixView(tag)
    }
  }
}

function addTags() {
  const { name } = route
  if (name) {
    useTagsViewStore().addView(route)
  }
}

function moveToCurrentTag() {
  nextTick(() => {
    for (const r of visitedViews.value) {
      if (r.path === route.path) {
        scrollPaneRef.value.moveToTarget(r)
        if (r.fullPath !== route.fullPath) {
          useTagsViewStore().updateVisitedView(route)
        }
      }
    }
  })
}

function scrollLeft() {
  if (!canScrollLeft.value) return
  scrollPaneRef.value.scrollToStart()
}

function scrollRight() {
  if (!canScrollRight.value) return
  scrollPaneRef.value.scrollToEnd()
}

function updateArrowState() {
  nextTick(() => {
    if (scrollPaneRef.value) {
      const state = scrollPaneRef.value.getScrollState()
      canScrollLeft.value = state.canLeft
      canScrollRight.value = state.canRight
    }
  })
}

function toggleFullscreen() {
  const mainContainer = document.querySelector('.main-container')
  const navbar = document.querySelector('.navbar')
  const sidebar = document.querySelector('.sidebar-container')
  if (!mainContainer) return

  if (!isFullscreen.value) {
    mainContainer.classList.add('fullscreen-mode')
    document.body.style.overflow = 'hidden'
    const elementsToHide = [{ el: navbar, originalDisplay: navbar?.style.display || '' }, { el: sidebar, originalDisplay: sidebar?.style.display || '' }]
    elementsToHide.forEach(item => {
      if (item.el && item.el.style.display !== 'none') {
        item.originalDisplay = item.el.style.display
        item.el.style.display = 'none'
        hiddenElements.value.push(item)
      }
    })
    isFullscreen.value = true
  } else {
    mainContainer.classList.remove('fullscreen-mode')
    document.body.style.overflow = ''
    hiddenElements.value.forEach(item => {
      if (item.el) {
        item.el.style.display = item.originalDisplay
      }
    })
    hiddenElements.value = []
    document.querySelector('.tags-action-btn').blur()
    isFullscreen.value = false
  }
}

function handleDropdownCommand(command) {
  const tag = selectedDropdownTag.value
  selectedTag.value = tag
  switch (command) {
    case 'refresh':     refreshSelectedTag(tag); break
    case 'fullscreen':  toggleFullscreen(); break
    case 'close':       closeSelectedTag(tag); break
    case 'closeOthers': closeOthersTags(); break
    case 'closeLeft':   closeLeftTags(); break
    case 'closeRight':  closeRightTags(); break
    case 'closeAll':    closeAllTags(tag); break
  }
}

function refreshSelectedTag(view) {
  proxy.$tab.refreshPage(view)
  if (route.meta.link) {
    useTagsViewStore().delIframeView(route)
  }
}

function closeSelectedTag(view) {
  proxy.$tab.closePage(view).then(({ visitedViews }) => {
    if (isActive(view)) {
      toLastView(visitedViews, view)
    }
  })
}

function closeRightTags() {
  proxy.$tab.closeRightPage(selectedTag.value).then(visitedViews => {
    if (!visitedViews.find(i => i.fullPath === route.fullPath)) {
      toLastView(visitedViews)
    }
  })
}

function closeLeftTags() {
  proxy.$tab.closeLeftPage(selectedTag.value).then(visitedViews => {
    if (!visitedViews.find(i => i.fullPath === route.fullPath)) {
      toLastView(visitedViews)
    }
  })
}

function closeOthersTags() {
  router.push(selectedTag.value).catch(() => { })
  proxy.$tab.closeOtherPage(selectedTag.value).then(() => {
    moveToCurrentTag()
  })
}

function closeAllTags(view) {
  proxy.$tab.closeAllPage().then(({ visitedViews }) => {
    if (affixTags.value.some(tag => tag.path === route.path)) {
      return
    }
    toLastView(visitedViews, view)
  })
}

function toLastView(visitedViews, view) {
  const latestView = visitedViews.slice(-1)[0]
  if (latestView) {
    router.push(latestView.fullPath)
  } else {
    if (view && view.name === 'Dashboard') {
      router.replace({ path: '/redirect' + view.fullPath })
    } else {
      router.push('/')
    }
  }
}

function openMenu(tag, e) {
  left.value = e.clientX
  top.value = e.clientY
  visible.value = true
  selectedTag.value = tag
}

function closeMenu() {
  visible.value = false
}

function handleScroll() {
  closeMenu()
  updateArrowState()
}
</script>

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