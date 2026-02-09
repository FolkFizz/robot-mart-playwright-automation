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

export const seededProducts = [
  {
    id: 1,
    name: 'Rusty-Bot 101',
    price: 299.99,
    category: 'automation'
  },
  {
    id: 2,
    name: 'Helper-X',
    price: 450.0,
    category: 'automation'
  },
  {
    id: 3,
    name: 'Cortex-99',
    price: 2500.0,
    category: 'high_tech'
  }
] as const;
