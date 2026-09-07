import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Повертає скрол догори при зміні сторінки */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
