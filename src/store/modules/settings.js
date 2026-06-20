import defaultSettings from '@/settings'
import { nextTick } from 'vue'
import { useDark, useToggle } from '@vueuse/core'
import { handleThemeStyle } from '@/utils/theme'

const isDark = useDark()
const toggleDark = useToggle(isDark)

const { showSettings, tagsView, fixedHeader, sidebarLogo, footerVisible, footerContent } = defaultSettings

const storageSetting = JSON.parse(localStorage.getItem('layout-setting') || 'null') || {}

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
