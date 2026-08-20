import { createTheme } from '@mui/material/styles'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-sans/900.css'

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
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 900,
      letterSpacing: '-0.03em',
      fontSize: 72,
      lineHeight: 1.05,
    },
    h2: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
      fontSize: 56,
      lineHeight: 1.08,
    },
    h3: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 40 },
    h4: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 28 },
    h5: { fontWeight: 700, fontSize: 22 },
    h6: { fontWeight: 700, fontSize: 18 },
    body1: { fontWeight: 400, fontSize: 17, lineHeight: 1.65 },
    body2: { fontWeight: 400, fontSize: 15, lineHeight: 1.6 },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.02em' },
    caption: { fontWeight: 500, letterSpacing: '0.12em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          borderRadius: 999, // pill buttons
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
          borderRadius: 22,
          boxShadow:
            '0 1px 2px rgba(13,13,15,.05), 0 8px 24px rgba(13,13,15,.08)',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: { borderRadius: 22 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 22 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 700 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none', backgroundColor: '#FFFFFF' },
      },
    },
  },
})

export default theme