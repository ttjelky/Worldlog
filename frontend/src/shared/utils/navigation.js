/**
 * Єдина навігація розділами з навбару.
 * Dashboard має власні внутрішні таби і не користується цим хелпером.
 */
export function goSection(id, navigate) {
  switch (id) {
    case 'home':
      navigate('/app')
      break
    case 'overview':
      navigate('/app?tab=overview')
      break
    case 'worlds':
      navigate('/app/worlds')
      break
    case 'friends':
      navigate('/app/friends')
      break
    case 'search':
      navigate('/app/search')
      break
    case 'notifications':
      navigate('/app/notifications')
      break
    default:
      break
  }
}
