# FindPhone — Design System

Status: Phase 2
Source of truth: [`shared/design-tokens.json`](../shared/design-tokens.json)
Generated outputs: `web/src/design-system/tokens.css` (CSS variables + Tailwind v4 `@theme`), `mobile/lib/core/generated/tokens.g.dart` (Flutter `ThemeExtension`s and constants)

```
npm run gen               # regenerate both platforms from the JSON
npm run gen -- --check    # fail if a generated file is out of date (part of npm test)
node scripts/check-contrast.mjs          # WCAG check of every colour pairing in use
node scripts/check-contrast.mjs --table  # full ratio table
```

---

## 1. Direction: "instrument panel"

FindPhone answers one question: **where is this phone, and how sure are we?** The interface should feel like a precise instrument: quiet chrome, data in front, freshness always visible.

| Principle | In practice |
|---|---|
| **Data over decoration** | The map, status badge and Device ID carry the screen. Panels are plain surfaces with one shadow level. There are no gradients, no glass and no illustrations. |
| **Freshness is the headline** | Every location appears next to its age. The status badge (Live / Last seen / Paused) is the first thing in the result card and on the mobile home screen. |
| **Machine values look like machine values** | Coordinates, Device ID, timestamps and accuracy use JetBrains Mono, so they're easy to compare between the phone and the screen. |
| **One accent, one meaning** | Teal means "this device" and "the main action". Green, amber and red are used for status only and are never decorative. |
| **Honest copy** | Microcopy says exactly what is shared, with whom and for how long. No "Oops!", no exclamation marks, no filler. |
| **Motion explains change** | Things move only when something actually changed: a panel arriving, a position update, a state change. |

What we avoid, and why: oversized rounded cards (they waste the narrow panel), pill-shaped everything (it makes badges and buttons look the same), stat tiles (there are no stats worth showing), and emoji, including country flags (they render inconsistently and are hard to read for screen-reader users).

---

## 2. Colour

**Neutrals:** zinc, chosen over slate because slate's blue tint goes muddy next to teal and the map's blue water.
**Accent:** teal-700 `#0f766e` in light mode, teal-400 `#2dd4bf` in dark mode (dark text on the accent).

### 2.1 Roles

| Role | Light | Dark | Used for |
|---|---|---|---|
| `bg.canvas` | `#fafafa` | `#09090b` | App background (mobile), page behind map (web) |
| `bg.surface` | `#ffffff` | `#141417` | Cards, sheets |
| `bg.raised` | `#ffffff` | `#1b1b1f` | Floating panel, map controls. In dark mode it's one step lighter instead of relying on a shadow. |
| `bg.subtle` | `#f4f4f5` | `#202024` | Info-row groups, skeletons, neutral banners |
| `border.default` | `#e4e4e7` | `#2e2e33` | Card edges, dividers |
| `border.control` | `#8a8a93` | `#71717b` | Input and checkbox boundaries (≥ 3:1) |
| `text.primary / secondary / tertiary` | `#18181b / #52525b / #67676f` | `#f4f4f5 / #b0b0b8 / #93939c` | Headings and values / supporting text / labels and captions |
| `accent.default` | `#0f766e` | `#2dd4bf` | Primary button, links, marker, checked controls |
| `focus.ring` | `#0d9488` | `#5eead4` | 2 px keyboard focus ring |
| `destructive.default` | `#b91c1c` | `#dc2626` | Delete confirmation only |
| `status.live` | fg `#15803d` / bg `#edfbf2` | fg `#4ade80` / bg `#0f2417` | Live |
| `status.stale` | fg `#a14a05` / bg `#fdf6e7` | fg `#fbbf24` / bg `#2a1f0a` | Last seen, offline |
| `status.danger` | fg `#b91c1c` / bg `#fef2f2` | fg `#f87171` / bg `#2c1414` | Errors |
| `status.paused` | fg `#52525b` / bg `#f4f4f5` | fg `#b0b0b8` / bg `#202024` | Paused, neutral info |

**Teal vs. green.** The accent (teal) and "Live" (green) are close in hue. To keep them apart, Live uses a yellower green (`#16a34a`), and a status colour **always** comes with a text label and a dot. Colour is never the only signal.

### 2.2 Contrast (verified, not estimated)

`scripts/check-contrast.mjs` checks 106 foreground/background pairings across both themes. Text needs 4.5:1 and non-text UI (borders, dots, focus rings, the marker fill against its ring) needs 3:1. **All 106 pass.** The tightest pair is the light-theme Live badge text on its tint, at 4.70:1. The script runs in `npm test`, so a token change that breaks AA fails the build.

Two adjustments came out of the check. `text.tertiary` is `#67676f` instead of zinc-500, so captions still pass on `bg.subtle`. `status.stale.fg` is `#a14a05` instead of amber-700, so it passes on the amber tint.

---

## 3. Typography

**Inter** for UI and **JetBrains Mono** for data. Both are bundled as font files: offline first launch on mobile, self-hosted `woff2` on web, no Google Fonts request.

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 32 / 40 | 600 | −0.02em | Onboarding headline only |
| `titleLg` | 24 / 32 | 600 | −0.015em | Screen titles (mobile) |
| `title` | 20 / 28 | 600 | −0.01em | Device name in result card |
| `titleSm` | 16 / 24 | 600 | −0.005em | Section and card titles |
| `bodyLg` | 16 / 24 | 400 | 0 | **Mobile body default** |
| `body` | 14 / 20 | 400 | 0 | **Web body default**, mobile secondary |
| `label` | 14 / 20 | 500 | 0 | Buttons, input labels |
| `labelSm` | 12 / 16 | 500 | 0.01em | Badges, banner text |
| `caption` | 12 / 16 | 400 | 0.005em | Info-row labels, helper text |
| `monoDisplay` | 24 / 32 | 600 | 0.04em | Device ID on the phone, recovery code |
| `mono` | 13 / 20 | 500 | 0 | Coordinates, Device ID (web), timestamps |
| `monoSm` | 12 / 16 | 400 | 0 | Exact timestamp under "Last seen" |

Rules: sentence case everywhere, never all-caps labels, at most two weights per screen (400 and 600, or 500 for controls). Line heights are on the 4 px grid. Mobile supports text scaling up to 200%: no fixed heights on text containers, and rows wrap instead of truncating values.

---

## 4. Space, radius, size, elevation

**Spacing:** 4 px base: `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Nothing else. On web, Tailwind's integer scale lands on these values (`p-4` = 16 px). Fractional utilities (`p-1.5`) are banned by a lint check in Phase 5.

| Context | Value |
|---|---|
| Screen edge padding (mobile) / panel padding (web) | 16 / 20 |
| Between related items (label → input, icon → text) | 8 |
| Between rows in a group | 12 |
| Between groups / sections | 24 |
| Map controls inset from viewport edge | 16 |

**Radius:** `xs 4` for badges, tooltips and skeleton bars. `md 8` for buttons, inputs, info-row groups, toasts and map controls. `lg 12` for panels, cards and the bottom-sheet top corners. `full` only for status dots, the marker and the sheet handle.

**Sizes:** controls are 44 px tall (`controlMd`). A 36 px `controlSm` exists **only** on web with a fine pointer (`@media (pointer: fine)`), and its hit area still extends to 44 px. Icons are 16 inline, 20 in controls and 24 in empty states. The web panel is 384 px wide; the mobile bottom-sheet peek is 176 px.

**Elevation:** three levels, used sparingly.

| Level | Where | Dark theme |
|---|---|---|
| `e1` | Marker, cards resting on canvas | Mostly invisible; the 1 px `border.default` does the work |
| `e2` | Floating search panel, map controls | `bg.raised` + border + shadow |
| `e3` | Toasts, dialogs, expanded bottom sheet | `bg.raised` + stronger shadow + scrim |

---

## 5. Motion

| Token | Value | Used for |
|---|---|---|
| `fast` | 150 ms | Hover, press, colour and badge changes, exit animations |
| `base` | 200 ms | Content crossfades (loading → result), toast enter |
| `slow` | 250 ms | Panel entrance (8 px rise + fade), sheet snap, dialog |
| `markerGlide` | 600 ms | Marker interpolation between two positions |
| `cameraMax` | ≤ 1400 ms | `flyTo`, scaled by distance |
| `pulse` | 2000 ms loop | Live marker ring, Live badge dot |
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | Everything entering or changing |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving |
| `move` | `cubic-bezier(0.4, 0, 0.2, 1)` | Marker glide (accelerates then settles, like a moving object) |

**A deliberate exception to the 150–250 ms rule.** UI chrome stays within 150–250 ms. *Spatial* motion (the marker and the camera) is longer on purpose: a 250 ms camera jump across a city disorients more than it informs. Both are tied to a real data change and are skipped under reduced motion.

**Reduced motion** (`prefers-reduced-motion` / `MediaQuery.disableAnimations`): no translate or scale, only a ≤ 150 ms opacity crossfade. `flyTo` becomes `jumpTo`, the marker jumps, and the pulse and skeleton shimmer are off.

---

## 6. Iconography

Lucide on web (`lucide-react`) and `lucide_icons_flutter` on mobile: the same glyphs and stroke on both. Icons are 20 px with a 1.75 stroke in controls and 16 px inline. Every icon names a concept, and none is decorative.

| Concept | Lucide | Where |
|---|---|---|
| Device / phone model | `smartphone` | Info row, onboarding |
| Search | `search` | Web search button |
| Live position / recenter | `locate-fixed` | Map control, logo mark |
| Accuracy | `crosshair` | Info row |
| Battery | `battery-full / -medium / -low / -warning` | Info row (chosen by level) |
| Time / last seen | `clock` | Info row |
| Copy / copied | `copy` → `check` | Device ID, coordinates |
| Refresh | `refresh-cw` | Result actions |
| Pause / resume | `pause` / `play` | Home |
| Delete | `trash-2` | Danger zone |
| Consent / privacy | `shield-check` | Consent, onboarding |
| Offline | `wifi-off` | Banners |
| Warning / error | `triangle-alert` / `circle-alert` | Permission health, inline errors |
| Map style | `layers` | Map control |
| Zoom | `plus` / `minus` | Map control |
| External link | `external-link` | Open in Google Maps |
| Settings deep link | `settings` | Permission recovery |
| Battery optimisation | `battery-charging` | Keep tracking reliable |
| Notification | `bell` | Notification permission |

---

## 7. Components

Each component is built once per platform (`web/src/design-system/components`, `mobile/lib/design_system/components`) and screens never restyle them.

### Button

| Variant | Rest | Hover | Pressed | Use |
|---|---|---|---|---|
| Primary | `accent` / `onAccent` | `accent.hover` | `accent.pressed` | One per view: Search, Register, Agree and continue |
| Secondary | `surface` + 1 px `border.default` / `text.primary` | `bg.hover` | `bg.pressed` | Copy, Refresh, Open settings |
| Ghost | transparent / `text.secondary` | `bg.hover` + `text.primary` | `bg.pressed` | Skip, Cancel, New search |
| Destructive | `destructive` / `onDestructive` | `destructive.hover` | `destructive.pressed` | Only inside the delete confirmation |
| Destructive ghost | transparent / `destructive.text` | `destructive.subtle` | — | "Stop sharing and delete my data" entry point |

Specs: 44 px tall, 16 px horizontal padding (12 px with a leading icon), 8 px icon gap, `label` type, `md` radius.
- **Focus:** 2 px `focus.ring` with a 2 px offset, `:focus-visible` only.
- **Disabled:** `bg.subtle` / `text.disabled`, no hover, `aria-disabled`, still focusable on web so the reason can be announced.
- **Loading:** a 16 px spinner replaces the leading icon, the label stays, the width is locked to prevent layout shift, and `aria-busy="true"` is set.

### Input and phone input

- The label sits above the field (`label`, `text.primary`, 8 px gap). There are no floating labels.
- The field is 44 px tall with 12 px padding, a 1 px `border.control`, `md` radius and `bg.surface`. The placeholder uses `text.tertiary` and only shows a format example, never the label.
- **Focus:** the border becomes `accent`, plus a 2 px `focus.ring` outline.
- **Error:** the border becomes `destructive.text`, and the helper text is replaced by the message with a `circle-alert` 16 icon, using `aria-invalid` and `aria-describedby`. The error appears on submit or on blur, never while typing.
- **Phone input:** one visual field with a country segment (`+91` + `chevron-down`, in mono, with a 1 px divider), then the national number. Digits are grouped as you type (`98765 43210`). The country picker is a searchable list of name + dial code. There are no flags.

### Status badge

24 px tall, 8 px horizontal padding, `xs` radius, an 8 px dot + `labelSm`. Variants: **Live** (dot pulses), **Last seen** (stale), **Paused**, **Error**, **Waiting**. The badge text says the state in words ("Live", "Last seen 18 min ago"), so it works without colour.

### Info row

A label column (`caption`, `text.tertiary`, 112 px fixed) and a value column (`body` or `mono`, `text.primary`), left-aligned and at least 36 px tall. Rows are grouped in a `bg.subtle` block with `md` radius and divided by `border.subtle`. The value can have a trailing copy icon button (20 px glyph, 44 px hit area).

### Toast

`bg.inverse` / `text.onInverse`, `md` radius, `e3`, max 400 px wide, at the bottom of the screen and above the bottom sheet. Info toasts last 4 s (`role="status"`); errors last 6 s and include an action (`role="alert"`). One toast at a time, and a new one replaces the old.

### Skeleton

`bg.subtle` blocks with `xs` radius, shaped exactly like the result card (badge, name, five rows), so nothing jumps when data arrives. The opacity pulses 0.6 → 1 over 1.2 s, and the block is static under reduced motion. Skeletons appear only after 150 ms, so fast responses don't flash.

### Empty state

Left-aligned inside the panel, not a centred hero: a 24 px icon in a 40 px `bg.subtle` square (`md` radius), a `titleSm` title, at most two lines of `body` in `text.secondary`, and at most one action.

### Banner

A slim strip (32 px minimum), `labelSm`, 16 px icon. **Offline / reconnecting**: `status.stale` colours. Banners never use the accent colour.

### Bottom sheet (web on mobile widths)

`lg` top corners, `e3`, and a 32 × 4 handle in `border.default`. Two snap points: **peek** (176 px: status, name, primary action) and **expanded** (content height, up to 85 vh). It can be dragged by the handle, and the handle is also a `<button aria-expanded>`, so it works from the keyboard and with screen readers.

### Dialog (mobile confirmations)

A title, one paragraph and right-aligned actions: Ghost "Cancel", then Destructive. The destructive action is never the default focus.

### Map elements (web)

| Element | Spec |
|---|---|
| Marker | 18 px `map.marker` fill, a **3 px white ring** (`map.markerHalo`, white in both themes), and a 1 px `map.markerOutline` edge outside the ring, plus `e1`. The white ring separates the marker from dark, satellite and coloured tiles; the thin dark edge keeps the ring visible on white roads, snow and the light basemap. The fill-to-ring contrast is in the contrast check (≥ 3:1 in both themes). |
| Pulse | Accent ring, scale 1 → 3, opacity 0.35 → 0, `pulse` loop. Only when Live. |
| Stale marker | Fill becomes `text.tertiary`, the white ring stays, no pulse. The data is visibly old. |
| Accuracy circle | `map.accuracyFill` + 1.5 px `map.accuracyStroke`, geodesic radius = accuracy (m) |
| Paused | No marker and no circle. The card explains why. |
| Controls | Right edge, 16 px inset, a vertical stack of 44 px `bg.raised` buttons with `e2` and `md` radius. Zoom +/− are grouped, then recenter, then the style toggle. |
| Basemap | **Satellite by default**, viewed straight down (pitch locked to 0). Keyless Esri World Imagery with a boundaries-and-places label overlay; MapTiler hybrid is used instead when `VITE_MAPTILER_KEY` is set. The layer toggle switches to Standard: OpenFreeMap Positron (light) / Dark. On imagery the accuracy circle gets a white edge, since teal disappears into vegetation and water. |
| Searching | While a lookup is in flight, a radar sweeps over the map: three white rings expanding plus a rotating beam, centred in the uncovered map area (above the sheet on mobile). The panel shows a matching mini radar, "Searching…" and the masked number. Static rings only under reduced motion. |
| Reveal | The result card staggers in (40 ms steps, info rows after the header), the status badge pops when its state changes, and the marker pops in with a single white ripple on first appearance. Buttons shrink 2% on press. All of it collapses to a short fade under reduced motion. |

---

## 8. Screens

### 8.1 Mobile

```
 Onboarding (×3)            Consent                       Register
┌─────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│                 Skip│   │ Before you turn on      │   │ Your details            │
│                     │   │ sharing                 │   │                         │
│  [smartphone 24]    │   │                         │   │ Name                    │
│                     │   │ ▪ What's shared …       │   │ ┌─────────────────────┐ │
│ Find this phone     │   │ ▪ Who can see it …      │   │ │ Asha Rao            │ │
│ from any browser    │   │ ▪ How long it's kept …  │   │ └─────────────────────┘ │
│                     │   │ ▪ How to stop …         │   │ Shown to people who …   │
│ If you lose this    │   │                         │   │                         │
│ phone, anyone you … │   │ Read the full privacy   │   │ Mobile number           │
│                     │   │ note ↗                  │   │ ┌──────┬──────────────┐ │
│                     │   │ ┌─┐ Anyone who knows my │   │ │+91 ▾ │ 98765 43210  │ │
│  ● ○ ○              │   │ └─┘ mobile number can … │   │ └──────┴──────────────┘ │
│ ┌─────────────────┐ │   │ ┌─────────────────────┐ │   │ ⓘ Demo mode: this number│
│ │    Continue     │ │   │ │ Agree and continue  │ │   │   isn't verified …      │
│ └─────────────────┘ │   │ └─────────────────────┘ │   │ ┌─────────────────────┐ │
└─────────────────────┘   └─────────────────────────┘   │ │ Register this phone │ │
                                                        │ └─────────────────────┘ │
                                                        └─────────────────────────┘
 Home
┌─────────────────────────────┐
│ FindPhone                   │
│ ┌─────────────────────────┐ │  ← status card: the most important thing on screen
│ │ ● Sharing is on         │ │
│ │ Last sync 14:32:10 · 9 s│ │  (timestamp in mono)
│ │ ┌─────────────────────┐ │ │
│ │ │ ‖  Pause sharing    │ │ │  secondary button
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
│ Device ID                   │
│ ┌─────────────────────────┐ │
│ │ FP-7K3Q          [copy] │ │  monoDisplay
│ │ Matches the ID shown on │ │
│ │ the FindPhone website.  │ │
│ └─────────────────────────┘ │
│ Permissions                 │
│ ┌─────────────────────────┐ │
│ │ Location   All the time✓│ │  info rows; a problem row turns amber
│ │ Notifications   Allowed✓│ │  and links to its fix
│ │ Battery    Restricted ! │ │  → Keep tracking reliable
│ └─────────────────────────┘ │
│                             │
│ [trash] Stop sharing and    │  destructive ghost, separated by 32 px
│         delete my data      │
└─────────────────────────────┘
```

### 8.2 Keep tracking reliable (Android)

When it appears: once after the permission step, **if** battery optimisation is on for FindPhone **or** the manufacturer is Samsung, Xiaomi/Redmi/POCO, Oppo, Realme or Vivo. It is always reachable from the Permissions card on Home. It isn't shown on iOS.

```
┌─────────────────────────────────┐
│ ←  Keep tracking reliable       │
│                                 │
│ Some phones stop background     │
│ apps to save battery. These     │
│ settings keep sharing running.  │
│                                 │
│ ┌─────────────────────────────┐ │  live checklist: re-checked on resume
│ │ ✓ Location: all the time    │ │
│ │ ✓ Notifications allowed     │ │
│ │ ! Battery optimisation on   │ │
│ │                 [ Turn off ]│ │  → system dialog
│ └─────────────────────────────┘ │
│                                 │
│ On your Xiaomi phone            │  detected from device_info_plus
│ 1. Settings › Apps › Manage     │
│    apps › FindPhone › Autostart │
│    › turn on                    │
│ 2. Same screen › Battery saver  │
│    › No restrictions            │
│ 3. Open Recents, long-press     │
│    FindPhone, tap the lock icon │
│ ┌─────────────────────────────┐ │
│ │ ⚙ Open FindPhone settings   │ │  secondary
│ └─────────────────────────────┘ │
│                                 │
│ Other phones                  ▾ │  collapsible: Samsung, Oppo, Realme, Vivo
│                                 │
│ Menu names vary by model and    │
│ Android version. dontkillmyapp  │
│ .com has guides for more phones.│
│ ┌─────────────────────────────┐ │
│ │            Done             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Checklist rows are detected live with `permission_handler`: `locationAlways`, `notification` and `ignoreBatteryOptimizations`. Manufacturer-specific settings (autostart, app locking) **can't be detected**, so they are instructions and not checkmarks. The app never claims a step is done when it can't verify it.

Manufacturer steps (sentence-case copy, `›` separators):

| Manufacturer | Steps |
|---|---|
| **Samsung** (One UI) | 1. Settings › Apps › FindPhone › Battery › Unrestricted. 2. Settings › Battery › Background usage limits › Never sleeping apps › add FindPhone. 3. Check that FindPhone isn't in Sleeping apps or Deep sleeping apps. |
| **Xiaomi / Redmi / POCO** (HyperOS, MIUI) | 1. Settings › Apps › Manage apps › FindPhone › Autostart › on. 2. Same screen › Battery saver › No restrictions. 3. Open Recents, long-press FindPhone, tap the lock icon. |
| **Oppo** (ColorOS) | 1. Settings › Apps › App management › FindPhone › Battery usage › turn on Allow background activity and Allow auto launch. 2. Open Recents, tap the menu on FindPhone, choose Lock. |
| **Realme** (Realme UI) | 1. Settings › Apps › App management › FindPhone › Battery usage › turn on Allow background activity and Allow auto launch. 2. Open Recents, tap the menu on FindPhone, choose Lock. |
| **Vivo** (Funtouch OS, OriginOS) | 1. Settings › Battery › Background power consumption management › FindPhone › Allow. 2. Settings › Apps › Autostart › turn on FindPhone (on older models: i Manager › App manager › Autostart). 3. Lock FindPhone in Recents. |

The "Turn off" button uses the system `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` dialog. That's fine for a test build. Google Play restricts this permission to certain app categories, so it is on the before-going-public checklist.

### 8.3 Web

```
 Desktop ≥1024                                          Mobile <768
┌──────────────────────────────────────────────────┐   ┌──────────────────────┐
│ ┌──────────────────────┐                   ┌──┐  │   │                ┌──┐  │
│ │ ◎ FindPhone          │                   │+ │  │   │     (map)      │+ │  │
│ │                      │                   │− │  │   │                │− │  │
│ │ Find a phone         │                   ├──┤  │   │        ◉       ├──┤  │
│ │ Mobile number        │       ( ◉ )       │◎ │  │   │       ( )      │◎ │  │
│ │ ┌────┬────────────┐  │      accuracy     ├──┤  │   │                │≋ │  │
│ │ │+91▾│98765 43210 │  │       circle      │≋ │  │   │                └──┘  │
│ │ └────┴────────────┘  │                   └──┘  │   ├──────────────────────┤
│ │ ┌──────────────────┐ │                         │   │        ────          │ ← handle
│ │ │      Search      │ │                         │   │ ● Live               │
│ │ └──────────────────┘ │                         │   │ Asha Rao     FP-7K3Q │ ← peek (176)
│ │ ──────────────────── │                         │   │ [Refresh] [Maps ↗]   │
│ │ ● Live               │                         │   ├──────────────────────┤
│ │ Asha Rao             │                         │   │ Number  +91 98•••…   │ ← expanded
│ │ ┌──────────────────┐ │                         │   │ Model   Pixel 7a     │
│ │ │Number +91 98•••••│ │                         │   │ …                    │
│ │ │Device FP-7K3Q    │ │                         │   └──────────────────────┘
│ │ │Model  Pixel 7a   │ │
│ │ │Battery 64%       │ │                   Tablet 768–1023: same floating panel,
│ │ │Accuracy ± 12 m   │ │                   344 px wide; the result collapses to
│ │ │Coords 12.97160,  │ │                   badge + name + actions until expanded.
│ │ │       77.59460   │ │
│ │ │Updated 14:32:10  │ │
│ │ └──────────────────┘ │
│ │ [⟳ Refresh] [Google Maps ↗]
│ │ New search           │
│ └──────────────────────┘
└──────────────────────────────────────────────────┘
```

Panel behaviour: before a search, the panel shows only the form. After a result, the form collapses into a one-line summary (`+91 98••• ••210 · New search`) so the result has the space. The panel never covers the marker: `flyTo` uses `padding.left = panelWidth + 32` on desktop and `padding.bottom = sheetPeek` on mobile.

---

## 9. Copy deck

Voice: plain, specific, calm, in the second person. Sentence case. Numbers are digits. Timestamps are 24-hour in the viewer's time zone.

### Mobile

| Where | Copy |
|---|---|
| Onboarding 1 | **Find this phone from any browser** — If you lose this phone, someone you trust can open the FindPhone website, enter your number and see where it is. |
| Onboarding 2 | **You decide when it's shared** — A notification stays visible while sharing is on. Pause it in one tap, or delete everything from the app. |
| Onboarding 3 | **What gets shared** — Location and how accurate it is · Battery level · Phone model and your name. *Never shared:* contacts, messages, photos, call history. |
| Consent checkbox | Anyone who knows my mobile number can see my device's latest location while sharing is on. |
| Consent button | Agree and continue |
| Consent footnote | Terms v1.0. You can withdraw consent at any time by deleting your data in the app. |
| Name helper | Shown to people who look up your number. |
| Number errors | Enter your mobile number. · That isn't a valid mobile number for {country}. · That number is too short. · That number is too long. · Use digits only, for example 98765 43210. |
| Demo notice | Demo mode: this number isn't verified. Only register your own number. |
| Number taken | This number is already registered on another phone. **[Reclaim with recovery code]** **[Use a different number]** |
| Recovery code | **Save your recovery code** — You'll need it to take this number back if you reinstall FindPhone or change phones. It won't be shown again. · Checkbox: I've saved it somewhere safe. |
| Reclaim error | That code doesn't match this number. Check for typos and try again. |
| Location rationale | **Allow location access** — FindPhone needs your location to show it on the map. It's only read while sharing is on. |
| Always (Android) | **Keep sharing after a restart** — Choose "Allow all the time" so sharing starts again on its own after your phone restarts. Without it, open FindPhone once after each restart. |
| Approximate only | **Precise location is off** — Approximate location can be off by up to 3 km. Turn on precise location for useful results. |
| Denied | Location access is off. Sharing can't start without it. **[Try again]** |
| Denied forever | Location is blocked for FindPhone. Turn it on in Settings › Apps › FindPhone › Permissions › Location. **[Open settings]** |
| Services off | Location is turned off on this phone. Turn it on, then come back. **[Open location settings]** |
| Notification permission | **Allow notifications** — Android shows a notification while sharing is on, so you always know. |
| Status on / paused | Sharing is on · Sharing is paused |
| Last sync | Last sync 14:32:10 · 9 s ago |
| Pause / resume | Pause sharing · Resume sharing |
| Paused hint | While paused, your location is removed and people looking up your number see "Sharing paused". |
| Copied | Device ID copied |
| Offline | You're offline. Your latest location will be sent when you reconnect. |
| Retry | Couldn't sync. Trying again in 30 s. |
| Daily quota | Daily sync limit reached for this demo project. Sharing resumes automatically after midnight Pacific time. |
| Ownership lost | This number was reclaimed on another phone. Sharing has stopped here. |
| Foreground notification | **Sharing location** — Anyone with your number can see this phone. Tap to open FindPhone. (Tapping opens Home, where pausing is one tap.) |
| Delete entry | Stop sharing and delete my data |
| Delete dialog | **Delete your data?** — Sharing stops and your name, number and location are permanently removed from FindPhone. Anyone who looks up your number will see "No device found". **[Cancel]** **[Delete everything]** |
| Deleted | Your data has been deleted. |

### Web

| Where | Copy |
|---|---|
| Heading / helper | **Find a phone** — Enter the number registered in the FindPhone app. |
| Input label / placeholder | Mobile number / 98765 43210 |
| Invalid | Enter a valid mobile number, for example 98765 43210. |
| Not found | **No device found for this number** — Check the number, or ask the owner to open FindPhone and turn sharing on. |
| Waiting | **Waiting for first location** — This phone is registered but hasn't sent its location yet. |
| Paused | **Sharing is paused** — The owner has paused location sharing, so no location is shown. |
| Live / stale | Live · Last seen 18 min ago (exact: `08 Oct 2026, 14:32:10 IST`) |
| Device ID hint | Matches the ID shown in the owner's app. |
| Rate limited | Too many searches. Try again in 42 s. |
| Network | Can't reach FindPhone. Check your connection and try again. **[Try again]** |
| Reconnecting | Reconnecting. Showing the last update received. |
| App Check blocked | This browser couldn't be verified. Turn off content blockers for this site and reload. |
| Actions | Search · Refresh · Open in Google Maps · New search |
| Map controls (aria) | Zoom in · Zoom out · Center on device · Switch to satellite view / Switch to map view |

---

## 10. Accessibility checklist (both platforms)

- [x] AA contrast in both themes, verified by `check-contrast.mjs` in CI.
- [ ] 44 × 44 minimum targets, including the copy icon and map controls.
- [ ] Every input has a visible label tied to it (`<label for>` / `Semantics(label)`). Placeholders never stand in for labels.
- [ ] Errors are announced: `aria-live="polite"` for result state changes, `role="alert"` for errors.
- [ ] Web is fully keyboard-operable: Tab order is search → result actions → map controls. `Enter` searches and `Esc` collapses the sheet. Focus is visible and moves to the result heading when a result arrives.
- [ ] Semantic HTML: `<main>`, `<form>`, `<h1>`/`<h2>`, a `<dl>` for info rows, and `<button>` (never a clickable `<div>`).
- [ ] The map canvas has `aria-label` and a text equivalent: the info rows already give coordinates, accuracy and time, so the map is never the only source.
- [ ] Status is never conveyed by colour alone (dot + word).
- [ ] Reduced motion is respected everywhere (§5).
- [ ] Mobile: text scaling to 200% without clipping, and TalkBack/VoiceOver labels on icon-only buttons.
