export const catalogSearch = {
  term: 'helper',
  noResults: 'no_such_robot_zzzz',
  partial: 'Rusty',
  specialChars: '@@@###'
} as const;

export const catalogCategories = {
  automation: 'automation',
  highTech: 'high_tech',
  unknown: 'unknown_category'
} as const;

export const catalogSort = {
  priceAsc: 'price_asc',
  priceDesc: 'price_desc',
  nameAsc: 'name_asc'
} as const;

export const catalogPrice = {
  min: 100,
  max: 1000,
  maxAffordable: 500,
  invalidMin: 2000,
  invalidMax: 100
} as const;
