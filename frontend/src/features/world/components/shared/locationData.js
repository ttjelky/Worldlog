import { useQuery } from '@tanstack/react-query'
import api from '../../../../api'

export const locationCategories = [
  ['farm', 'Ферма'],
  ['mine', 'Шахта'],
  ['town', 'Містечко'],
  ['base', 'База'],
  ['structure', 'Структура'],
  ['biome', 'Біом'],
  ['build', 'Споруда'],
  ['poi', 'Точка інтересу'],
  ['other', 'Інше'],
]
export const locationCategoryLabels = Object.fromEntries(locationCategories)
const legacyCategoryLabels = {
  village: locationCategoryLabels.town,
  temple: locationCategoryLabels.build,
}

export function categoryLabel(category) {
  return legacyCategoryLabels[category] || locationCategoryLabels[category] || locationCategoryLabels.other
}

/**
 * Спільне джерело локацій світу. React Query дедуплікує запит, тому
 * всі секції користуються тим самим кешем, що й картка «Локації».
 */
export function useLocations(worldId) {
  return useQuery({
    queryKey: ['locations', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/locations/`).then((r) => r.data),
  })
}
