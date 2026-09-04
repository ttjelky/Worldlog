import LandingHeader from './components/LandingHeader/LandingHeader'
import Hero from './components/Hero/Hero'
import TrustBar from './components/TrustBar/TrustBar'
import HowItWorks from './components/HowItWorks/HowItWorks'
import FeatureGrid from './components/FeatureGrid/FeatureGrid'
import Differentiators from './components/Differentiators/Differentiators'
import FAQ from './components/FAQ/FAQ'
import FinalCTA from './components/FinalCTA/FinalCTA'
import LandingFooter from './components/LandingFooter/LandingFooter'

export default function Landing({ onStart }) {
  return (
    <>
      <LandingHeader onStart={onStart} />
      <Hero onStart={onStart} />
      <TrustBar />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <FeatureGrid />
      <Differentiators />
      <FAQ />
      <FinalCTA onStart={onStart} />
      <LandingFooter />
    </>
  )
}
