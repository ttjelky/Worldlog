/* Палітри тем світу. Кожен ключ відповідає значенню поля theme у World.
   accentRed / accentGreen — дві «слота» акцентів, якими розфарбовуються
   картки-секції дошки; cover — акцент обкладинки; решта — змінні сторінки. */
export const WORLD_THEMES = {
  sulfur_caves: {
    id: 'sulfur_caves',
    name: 'Сіркові печери',
    pageBg: '#F4FBC3',
    accentRed: '#A63C39',
    accentGreen: '#247A57',
    cover: '#6b7280',
    ink: '#1d1a22',
    soft: 'rgba(0, 0, 0, 0.06)',
    softHover: 'rgba(0, 0, 0, 0.1)',
    activeBg: '#1d1a22',
    activeBgHover: '#333333',
    activeInk: '#ffffff',
    rowBg: 'rgba(0, 0, 0, 0.04)',
    rowLabel: 'rgba(0, 0, 0, 0.5)',
    outline: 'rgba(0, 0, 0, 0.15)',
    outlineHover: 'rgba(0, 0, 0, 0.35)',
    dragOver: '#1d1a22',
    resize: 'rgba(0, 0, 0, 0.25)',
    resizeActive: 'rgba(0, 0, 0, 0.4)',
    dialogBg: '#faf6e0',
    dialogInk: '#1d1a22',
    dialogMuted: '#5f5847',
    dialogOutline: '#b8ad8a',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Аметистова',
    pageBg: '#dfcefd',
    accentRed: '#9166c8',
    accentGreen: '#ab8cdd',
    cover: '#7a52b0',
    ink: '#1d1a22',
    soft: 'rgba(0, 0, 0, 0.06)',
    softHover: 'rgba(0, 0, 0, 0.1)',
    activeBg: '#1d1a22',
    activeBgHover: '#333333',
    activeInk: '#ffffff',
    rowBg: 'rgba(0, 0, 0, 0.04)',
    rowLabel: 'rgba(0, 0, 0, 0.5)',
    outline: 'rgba(0, 0, 0, 0.15)',
    outlineHover: 'rgba(0, 0, 0, 0.35)',
    dragOver: '#1d1a22',
    resize: 'rgba(0, 0, 0, 0.25)',
    resizeActive: 'rgba(0, 0, 0, 0.4)',
    dialogBg: '#f4edfe',
    dialogInk: '#1d1a22',
    dialogMuted: '#4b4358',
    dialogOutline: '#cdc0dd',
  },
  trial_palace: {
    id: 'trial_palace',
    name: 'Палац випробувань',
    pageBg: '#434343',
    accentRed: '#d57c6a',
    accentGreen: '#54ac98',
    cover: '#7d7188',
    ink: '#ffffff',
    soft: 'rgba(255, 255, 255, 0.12)',
    softHover: 'rgba(255, 255, 255, 0.2)',
    activeBg: '#ffffff',
    activeBgHover: '#e6e6e6',
    activeInk: '#1d1a22',
    rowBg: 'rgba(255, 255, 255, 0.08)',
    rowLabel: 'rgba(255, 255, 255, 0.6)',
    outline: 'rgba(255, 255, 255, 0.3)',
    outlineHover: 'rgba(255, 255, 255, 0.55)',
    dragOver: '#d57c6a',
    resize: 'rgba(255, 255, 255, 0.35)',
    resizeActive: 'rgba(255, 255, 255, 0.6)',
    dialogBg: '#434343',
    dialogInk: '#ffffff',
    dialogMuted: 'rgba(255, 255, 255, 0.72)',
    dialogOutline: 'rgba(255, 255, 255, 0.35)',
  },
}

export const DEFAULT_THEME_ID = 'sulfur_caves'

export function getWorldTheme(themeId) {
  return WORLD_THEMES[themeId] || WORLD_THEMES[DEFAULT_THEME_ID]
}

/* CSS-змінні для діалогів (редагування світу, тема), щоб вони
   підлаштовувались під палітру поточної теми світу. */
export function themeDialogStyle(themeId) {
  const t = getWorldTheme(themeId)
  return {
    '--accent': t.accentRed,
    '--dialog-bg': t.dialogBg,
    '--dialog-ink': t.dialogInk,
    '--dialog-muted': t.dialogMuted,
    '--dialog-outline': t.dialogOutline,
  }
}
