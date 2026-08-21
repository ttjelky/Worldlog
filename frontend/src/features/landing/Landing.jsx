import LandingHeader from './components/LandingHeader/LandingHeader'
import Hero from './components/Hero/Hero'
import StatsBar from './components/StatsBar/StatsBar'
import FeatureCards from './components/FeatureCards/FeatureCards'
import ComingSoon from './components/ComingSoon/ComingSoon'
import LandingFooter from './components/LandingFooter/LandingFooter'

export default function Landing({ onStart }) {
  return (
    <>
      <LandingHeader onStart={onStart} />
      <Hero onStart={onStart} />
      <StatsBar />
      <FeatureCards />
      <ComingSoon onStart={onStart} />
      <LandingFooter />
    </>
  )
}
