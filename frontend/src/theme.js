import { createTheme } from '@mui/material/styles'

/*
 * Font: Inter — imported via global.css (@fontsource/inter).
 * Inter supports Cyrillic (Ukrainian), Latin, and all needed glyphs.
 */
const fontFamily = '"Inter", system-ui, -apple-system, sans-serif'

const palette = {
  primary: {
    main: '#7C83F5',
    dark: '#5C63E0',
    light: '#E9EAFC',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#4CAF7D',
    dark: '#3a9063',
    light: '#B7EAC7',
    contrastText: '#FFFFFF',
  },
  text: {
    primary: '#0D0D0F',
    secondary: 'rgba(13, 13, 15, 0.65)',
  },
  background: {
    default: '#FFFFFF',
    paper: '#FFFFFF',
  },
  success: { main: '#4CAF7D', light: '#B7EAC7' },
  divider: 'rgba(13, 13, 15, 0.10)',
}

const theme = createTheme({
  palette,
  shape: { borderRadius: 18 },
  typography: {
    fontFamily,
    h1: {
      fontFamily,
      fontWeight: 900,
      letterSpacing: '-0.03em',
      fontSize: 72,
      lineHeight: 1.05,
    },
    h2: {
      fontFamily,
      fontWeight: 900,
      letterSpacing: '-0.02em',
      fontSize: 56,
      lineHeight: 1.08,
    },
    h3: { fontFamily, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 40 },
    h4: { fontFamily, fontWeight: 700, letterSpacing: '-0.01em', fontSize: 28 },
    h5: { fontFamily, fontWeight: 700, fontSize: 22 },
    h6: { fontFamily, fontWeight: 700, fontSize: 18 },
    body1: { fontFamily, fontWeight: 400, fontSize: 17, lineHeight: 1.65 },
    body2: { fontFamily, fontWeight: 400, fontSize: 15, lineHeight: 1.6 },
    button: { fontFamily, fontWeight: 700, textTransform: 'none', letterSpacing: '0.02em' },
    caption: { fontFamily, fontWeight: 500, letterSpacing: '0.12em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          fontFamily,
          borderRadius: 999,
          padding: '12px 26px',
          fontSize: 15,
          fontWeight: 700,
        },
        containedPrimary: {
          backgroundColor: palette.primary.main,
          '&:hover': { backgroundColor: palette.primary.dark },
        },
        containedSecondary: {
          backgroundColor: palette.secondary.main,
          '&:hover': { backgroundColor: palette.secondary.dark },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          fontFamily,
          borderRadius: 22,
          boxShadow: '0 1px 2px rgba(13,13,15,.05), 0 8px 24px rgba(13,13,15,.08)',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { borderRadius: 22 } },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 22 } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          fontFamily,
          '& .MuiOutlinedInput-root': { borderRadius: 16 },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 999, fontWeight: 700 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none', backgroundColor: '#FFFFFF' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { fontFamily, fontSize: 14, fontWeight: 700, textTransform: 'none' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: palette.primary.main },
      },
    },
  },
})

export default theme
