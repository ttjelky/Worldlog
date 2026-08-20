import { Box, Button, Chip, Container, Typography, useMediaQuery } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useTheme } from '@mui/material/styles'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Logo from '../components/Logo'

const navLinks = ['Головна', 'Про проєкт', 'GitHub']

const features = [
  {
    title: 'Гравці',
    text: 'Склад команди: нікнейми, ролі та аватари кожного учасника вашого світу.',
    icon: <GroupsOutlinedIcon />,
  },
  {
    title: 'Локації',
    text: 'Бази, ферми, шахти та споруди з координатами X/Y/Z і галереєю скріншотів.',
    icon: <PlaceOutlinedIcon />,
  },
  {
    title: 'Todo-лист',
    text: 'Плани та цілі: пріоритети, дедлайни і стан виконання — все під рукою.',
    icon: <CheckCircleOutlineOutlinedIcon />,
  },
  {
    title: 'Історія-роадмапа',
    text: 'Кожна важлива подія світу впорядкована за датою на зрозумілій часовій шкалі.',
    icon: <TimelineOutlinedIcon />,
  },
]

const statBar = [
  { value: '04', label: 'Розділи світу' },
  { value: '∞', label: 'Локацій та подій' },
  { value: '100%', label: 'Твій паспорт' },
]

export default function Landing({ onStart }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  return (
    <Box bgcolor="#FFFFFF" color="#0D0D0F" minHeight="100vh">
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(13,13,15,.06)',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Logo />
            <Box component="nav" display={{ xs: 'none', md: 'flex' }} gap={4} alignItems="center">
              {navLinks.map((l) => (
                <Typography key={l} variant="button" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  {l}
                </Typography>
              ))}
            </Box>
            <Button variant="contained" color="primary" onClick={onStart}>
              Створити паспорт світу
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box component="section" sx={{ pt: { xs: 6, md: 10 }, pb: 0 }}>
        <Container maxWidth="lg">
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '.35em', fontWeight: 700, mb: 2, display: 'block' }}>
            WorldLog · by DiJital
          </Typography>
          <Typography variant="h1" component="h1" sx={{ fontSize: { xs: 44, md: 76 }, mb: 4 }}>
            ДОКУМЕНТУЙ СВІТИ.
            <br />
            <Box component="span" sx={{ color: 'primary.main' }}>ЗБЕРІГАЙ ІСТОРІЮ</Box>
          </Typography>

          <Grid container spacing={6} alignItems="stretch">
            {/* Left: big screenshot/mockup */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  height: { xs: 280, md: 460 },
                  borderRadius: 28,
                  background:
                    'linear-gradient(160deg, #E9EAFC 0%, #DEE4FF 55%, #F3F1FF 100%)',
                  border: '1px solid rgba(124,131,245,.18)',
                  boxShadow: '0 20px 60px rgba(13,13,15,.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: '78%',
                    bgcolor: '#FFFFFF',
                    borderRadius: 18,
                    boxShadow: '0 24px 60px rgba(13,13,15,.22)',
                    p: 2,
                  }}
                >
                  <Box display="flex" gap={1} mb={2}>
                    <Box width={10} height={10} borderRadius="50%" bgcolor="#F87171" />
                    <Box width={10} height={10} borderRadius="50%" bgcolor="#FBBF24" />
                    <Box width={10} height={10} borderRadius="50%" bgcolor="#4ADE80" />
                  </Box>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                    {[0, 1, 2, 3].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          height: 54,
                          borderRadius: 12,
                          bgcolor: i % 2 ? '#E9EAFC' : '#DDE0FF',
                          display: 'flex',
                          alignItems: 'center',
                          px: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            bgcolor: i === 0 ? '#7C83F5' : '#B7EAC7',
                            mr: 1,
                          }}
                        />
                        <Box
                          sx={{
                            width: '60%',
                            height: 8,
                            borderRadius: 99,
                            bgcolor: 'rgba(13,13,15,.14)',
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Right: light panel */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  height: '100%',
                  bgcolor: '#E9EAFC',
                  borderRadius: 28,
                  p: { xs: 4, md: 6 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Typography variant="overline" sx={{ letterSpacing: '.35em', fontWeight: 700, color: 'primary.dark' }}>
                  Для тих, хто будує
                </Typography>
                <Typography variant="h3" component="h2">
                  Паспорт твого Minecraft-світу
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  WorldLog допомагає задокументувати все, що відбувається у світі:
                  гравців, локації, плани й історію. Твій світ заслуговує на
                  власний літопис.
                </Typography>
                <Box>
                  <Button variant="contained" color="primary" endIcon={<ArrowForwardIcon />} onClick={onStart}>
                    Дізнатись більше
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Feature strip with vertical dividers */}
      <Box component="section" sx={{ mt: 10, borderTop: '1px solid rgba(13,13,15,.08)', borderBottom: '1px solid rgba(13,13,15,.08)' }}>
        <Container maxWidth="lg">
          <Grid container>
            {statBar.map((f, i) => (
<Grid
                  size={{ xs: 12, md: 4 }}
                  key={f.label}
                sx={{
                  py: 5,
                  px: 4,
                  borderRight: { md: i < 2 ? '1px solid rgba(13,13,15,.08)' : 'none' },
                  borderBottom: { xs: i < 2 ? '1px solid rgba(13,13,15,.08)' : 'none' },
                }}
              >
                <Typography variant="h2" sx={{ color: 'primary.main' }}>{f.value}</Typography>
                <Typography variant="overline" sx={{ letterSpacing: '.22em', fontWeight: 700 }}>{f.label}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features cards */}
      <Box component="section" sx={{ py: 12 }}>
        <Container maxWidth="lg">
          <Typography variant="overline" sx={{ letterSpacing: '.35em', fontWeight: 700, color: 'primary.main', display: 'block', mb: 2 }}>
            Можливості
          </Typography>
          <Typography variant="h2" component="h2" sx={{ mb: 6, fontSize: { xs: 40, md: 56 } }}>
            Все для літопису світу
          </Typography>
          <Grid container spacing={4}>
            {features.map((f) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.title}>
                <Box
                  sx={{
                    borderRadius: 24,
                    p: 4,
                    height: '100%',
                    bgcolor: isDesktop ? '#F7F7FF' : '#FFFFFF',
                    transition: 'transform .2s ease, box-shadow .2s ease',
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 40px rgba(13,13,15,.10)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 18,
                      bgcolor: '#E9EAFC',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography variant="h6" mb={1}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Roadmap / Coming soon */}
      <Box component="section" sx={{ py: 12, bgcolor: '#0D0D0F', color: '#FFFFFF' }}>
        <Container maxWidth="lg">
          <Box maxWidth={720} mx="auto" textAlign="center">
            <Chip label="В розробці" sx={{ bgcolor: '#B7EAC7', color: '#0D0D0F', mb: 3 }} />
            <Typography variant="h2" component="h2" sx={{ mb: 3, fontSize: { xs: 40, md: 56 } }}>
              Скоро: спільні світи
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,.72)', mb: 4 }}>
              Запрошуй друзів у світ, давай ролі редактора чи глядача і
              документуйте історію разом. Ми вже заклали архітектуру — залишилось
              трохи почекати.
            </Typography>
            <Button variant="contained" color="secondary" onClick={onStart}>
              Взяти участь
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: '#FFFFFF', py: 6, borderTop: '1px solid rgba(13,13,15,.08)' }}>
        <Container maxWidth="lg">
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4} justifyContent="space-between" alignItems="center">
            <Logo />
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} DiJital. Публічний open-source проєкт.
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<GitHubIcon />}
              href="https://github.com/dijital/worldlog"
              target="_blank"
              rel="noreferrer"
              sx={{ borderColor: 'rgba(13,13,15,.18)', color: '#0D0D0F' }}
            >
              GitHub
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}