import { Box } from '@mui/material'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'

export default function Logo({ variant = 'nav', onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C83F5 0%, #5C63E0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(124,131,245,.35)',
        }}
      >
        <ExploreOutlinedIcon fontSize="small" />
      </Box>
      <Box sx={{ lineHeight: 1.1 }}>
        <Box sx={{ fontWeight: 900, fontSize: 20, color: '#0D0D0F' }}>WorldLog</Box>
        <Box sx={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C63E0' }}>
          by DiJital
        </Box>
      </Box>
    </Box>
  )
}