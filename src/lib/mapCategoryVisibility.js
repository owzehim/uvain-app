import { MAP_CATEGORIES } from './mapCategories'

export function getVisibleMapCategories(restaurants = []) {
  const categoriesWithMarkers = new Set(
    restaurants
      .map((restaurant) => restaurant?.category)
      .filter(Boolean),
  )

  return MAP_CATEGORIES.filter((category) => (
    category === MAP_CATEGORIES[0] || categoriesWithMarkers.has(category)
  ))
}
