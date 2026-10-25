import { MenuItem, CafeOrder } from '../types/cafe.types';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm_fanta',
    name: 'Fanta',
    category: 'beverages',
    price: 40,
    description: 'Chilled sparkling orange flavoured drink',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
  {
    id: 'm_redbull',
    name: 'Redbull',
    category: 'beverages',
    price: 125,
    description: 'Chilled energy drink (250ml can)',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
  {
    id: 'm_amul_cool',
    name: 'Amul Cool',
    category: 'beverages',
    price: 60,
    description: 'Chilled flavoured milk bottle',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
  {
    id: 'm_hell',
    name: 'Hell',
    category: 'beverages',
    price: 60,
    description: 'Classic energy drink (250ml can)',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
  {
    id: 'm_cola',
    name: 'Cola',
    category: 'beverages',
    price: 50,
    description: 'Chilled refreshing fizzy cola',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
  {
    id: 'm_mineral_water',
    name: 'Mineral Water',
    category: 'beverages',
    price: 10,
    description: 'Packaged chilled drinking water (500ml/1L)',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },
];

// Sanitized: Zero fake orders. Kitchen KOT board starts clean.
export const INITIAL_ORDERS: CafeOrder[] = [];
