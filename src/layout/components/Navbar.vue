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
