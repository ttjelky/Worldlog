import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_ID, WORLD_THEMES, getWorldTheme, themeDialogStyle } from './themes'

const REQUIRED_KEYS = [
  'id',
  'name',
  'pageBg',
  'accentRed',
  'accentGreen',
  'cover',
  'ink',
  'dialogBg',
  'dialogInk',
  'dialogMuted',
  'dialogOutline',
]

describe('world themes', () => {
  it('falls back to default theme for unknown ids', () => {
    expect(getWorldTheme('nope')).toBe(WORLD_THEMES[DEFAULT_THEME_ID])
    expect(getWorldTheme(undefined)).toBe(WORLD_THEMES[DEFAULT_THEME_ID])
  })

  it('every theme has all required keys', () => {
    for (const theme of Object.values(WORLD_THEMES)) {
      for (const key of REQUIRED_KEYS) {
        expect(theme[key], `${theme.id} missing ${key}`).toBeTruthy()
      }
    }
  })

  it('theme ids match their keys', () => {
    for (const [key, theme] of Object.entries(WORLD_THEMES)) {
      expect(theme.id).toBe(key)
    }
  })

  it('themeDialogStyle exposes dialog variables', () => {
    const style = themeDialogStyle('sulfur_caves')
    expect(style['--accent']).toBeTruthy()
    expect(style['--dialog-bg']).toBeTruthy()
    expect(style['--dialog-ink']).toBeTruthy()
  })
})
