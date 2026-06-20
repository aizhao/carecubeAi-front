# UI Framework Redesign — Apple Design Language

**Date:** 2026-06-17
**Scope:** Global framework shell only (sidebar, navbar, tags-view, settings, layout)
**Reference:** `/Users/zhaoai/carecubeAi/DESIGN.md`

## Design Tokens

Colors and typography from DESIGN.md. No new tokens introduced.

### Colors Used

| Token | Hex | Use |
|-------|-----|-----|
| Action Blue | `#0066cc` | All interactive elements, links, active indicators |
| Action Blue Focus | `#0071e3` | Hover state on blue elements |
| Ink | `#1d1d1f` | All text on light surfaces |
| Ink Muted 80 | `#333333` | Navbar icon color |
| Ink Muted 48 | `#7a7a7a` | Secondary text, breadcrumb, muted labels |
| Parchment | `#f5f5f7` | Global shell background (sidebar, navbar, tags-view) |
| Canvas | `#ffffff` | Content area, active tags, cards |
| Hairline | `#e0e0e0` | Borders and dividers |
| Divider Soft | `#f0f0f0` | Table borders, subtle separators |

### Typography

All framework chrome uses:
- Font: `SF Pro Text, system-ui, -apple-system, sans-serif`
- Menu items: 14px / 400 (caption)
- Navbar breadcrumb: 14px (caption)
- Tags: 14px (caption)
- Logo title: 14px / 600 (body-strong)

### Corner Radius

| Token | Use |
|-------|-----|
| `sm` (8px) | Active tags, sidebar menu items |
| `pill` (9999px) | No use in shell (reserved for content buttons) |
| `none` (0px) | Layout containers |

---

## 1. Sidebar

| Property | Value |
|----------|-------|
| Background | `#f5f5f7` (Parchment) |
| Right border | 1px `#e0e0e0` (Hairline) — no shadow |
| Menu text color | `#1d1d1f` (Ink) |
| Menu item height | 44px |
| Menu hover background | `rgba(0, 0, 0, 0.04)` |
| Menu active background | `#ffffff` card |
| Menu active indicator | 3px left border in `#0066cc` |
| Menu active text | `#0066cc` (Action Blue) |
| Expanded width | 220px |
| Collapsed width | 64px |
| Logo area height | 52px |
| Logo icon size | 32px |
| Transition | No animation on collapse (instant) |

**Removed:**
- `sideTheme` setting (no dark variant)
- Dark background (`#1a1f2e`)
- Pseudo-element overlay for active/hover in dark mode
- Collapse shadow

## 2. Navbar

| Property | Value |
|----------|-------|
| Background | `#f5f5f7` (Parchment) |
| Bottom border | 1px `#e0e0e0` (Hairline) — replaces shadow |
| Height | 44px |
| Breadcrumb text | 14px, `#7a7a7a` |
| Right icon color | `#333333` |
| Right icon size | 18px |
| User avatar | 28px circle, no border |
| User name | 14px / 600 |
| Hamburger icon | 1.5px stroke, `#1d1d1f` |

**Removed:**
- `box-shadow: 0 1px 4px rgba(0,21,41,0.08)`
- RuoYiGit and RuoYiDoc components (already removed)
- Size select moved into settings panel
- `navType` — only vertical left sidebar supported
- `TopNav` and `TopBar` components no longer rendered

## 3. TagsView

Single unified style (replaces card + chrome variants).

| Property | Value |
|----------|-------|
| Background | `#f5f5f7` |
| Height | 36px |
| Inactive tag text | `#7a7a7a`, 14px |
| Inactive tag background | transparent |
| Active tag background | `#ffffff` |
| Active tag indicator | 2px bottom border `#0066cc` |
| Active tag text | `#1d1d1f` |
| Tag border radius | 8px top, 0 bottom |
| Tag gap | 2px |
| Close button | Hidden by default, visible on hover only |
| Close button color | `#999999` |

**Removed:**
- `tagsViewStyle` setting (card/chrome)
- `tagsViewPersist`, `tagsIcon` settings
- Green `#42b983` active color
- Dot decoration on active tag
- `hasTagsView` CSS class noise

## 4. Layout Shell

| Property | Value |
|----------|-------|
| Content background | `#ffffff` (Canvas) |
| Shell background | `#f5f5f7` (Parchment) — shared by sidebar, navbar, tags |
| Content padding | 24px (spacing.lg) |
| Max content width | 1440px |
| Mobile breakpoint | 992px |

**Removed:**
- `navType` switching logic in layout/index.vue
- All three CSS inline variables on `.app-wrapper`
- `sidebarHide` class toggling
- `theme` CSS variable injection

## 5. Settings Panel

Reduced from ~12 options to 5:

| Setting | Default |
|---------|---------|
| Theme color picker | `#0066cc` (8 preset colors) |
| Fixed header (fixedHeader) | true |
| Show tags view (tagsView) | true |
| Show sidebar logo (sidebarLogo) | true |
| Show footer (footerVisible) | false |

**Removed:**
- `navType` selector (3 thumbnail previews)
- `sideTheme` selector (dark/light thumbnails)
- `tagsViewStyle` radio
- `tagsViewPersist`, `tagsIcon`, `dynamicTitle` toggles
- Panel width: 300px → 280px

## 6. Dark Mode

**Removed entirely:**
- `html.dark` class toggle
- `useDark()` / `useToggle()` from VueUse
- `isDark` state in settings store
- `toggleTheme()` method
- View Transitions API radial animation
- All `html.dark {}` CSS blocks in `variables.module.scss`

## 7. Removed Features Summary

| Feature | Reason |
|---------|--------|
| Top navigation (navType 2) | No longer needed |
| Top-only mode (navType 3) | No longer needed |
| Dark/light sidebar themes | Unified Parchment shell |
| Card/Chrome tags styles | Single unified style |
| Dark mode | Removed to simplify |
| Tags persistence/icons | Unnecessary complexity |
| Dynamic title | Not needed |

## File Change List

| File | Action |
|------|--------|
| `src/assets/styles/variables.module.scss` | Rewrite — remove dark mode, new tokens |
| `src/assets/styles/sidebar.scss` | Rewrite — new simplified styles |
| `src/assets/styles/index.scss` | Update — remove dark overrides |
| `src/assets/styles/element.scss` | Update — minimize |
| `src/layout/index.vue` | Update — remove navType logic |
| `src/layout/components/Sidebar/index.vue` | Update — remove theme class |
| `src/layout/components/Sidebar/SidebarItem.vue` | Update — simplified |
| `src/layout/components/Sidebar/Logo.vue` | Already updated |
| `src/layout/components/Sidebar/Item.vue` | No change |
| `src/layout/components/Sidebar/Link.vue` | No change |
| `src/layout/components/Navbar.vue` | Update — height, colors, remove TopNav/TopBar |
| `src/layout/components/TagsView/index.vue` | Rewrite — single unified style |
| `src/layout/components/Settings/index.vue` | Rewrite — simplified options |
| `src/layout/components/AppMain.vue` | Update — new height calculation |
| `src/store/modules/settings.js` | Rewrite — remove isDark, navType, sideTheme, etc. |
| `src/store/modules/app.js` | Minimal change |
| `src/settings.js` | Update — new defaults |
| `src/utils/theme.js` | Update — remove dark mode color softening |
