import { MenuItem, CafeOrder } from '../types/cafe.types';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Artisanal Coffees
  {
    id: 'm_espresso',
    name: 'Artisanal Double Espresso',
    category: 'coffee',
    price: 60,
    description: '100% Arabica washed roast, balanced crema',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 5,
  },
  {
    id: 'm_cappuccino',
    name: 'Cue Master Cappuccino',
    category: 'coffee',
    price: 90,
    description: 'Steamed microfoam with velvet texture & cocoa dust',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 6,
  },
  {
    id: 'm_cold_coffee',
    name: 'Classic Chilled Cold Coffee',
    category: 'coffee',
    price: 80,
    description: 'Blended espresso with rich chilled milk & cream',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 5,
  },
  
  // Beverages & Coolers
  {
    id: 'm_blue_lagoon',
    name: 'Electric Blue Mocktail',
    category: 'beverages',
    price: 110,
    description: 'Blue curacao, crushed lime, mint and fizzy soda',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 5,
  },
  {
    id: 'm_iced_tea',
    name: 'Lemon Mint Iced Tea',
    category: 'beverages',
    price: 70,
    description: 'Fresh brewed black tea chilled with Meyer lemon & mint',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 4,
  },
  {
    id: 'm_mineral_water',
    name: 'Packaged Mineral Water (1L)',
    category: 'beverages',
    price: 25,
    description: 'Purified mineral drinking water',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 1,
  },

  // Snacks & Quick Bites
  {
    id: 'm_peri_fries',
    name: 'Crispy Peri-Peri Fries',
    category: 'snacks',
    price: 110,
    description: 'Golden fried potato fries tossed in spicy peri peri dust',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 8,
  },
  {
    id: 'm_garlic_bread',
    name: 'Cheese Garlic Bread',
    category: 'snacks',
    price: 130,
    description: 'Toasted baguette with garlic butter and melted mozzarella',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 10,
  },
  {
    id: 'm_club_sandwich',
    name: 'Veg Club Sandwich',
    category: 'snacks',
    price: 140,
    description: 'Triple decker toasted sandwich with cucumber, tomato & cheese',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 12,
  },
  {
    id: 'm_paneer_pizza',
    name: 'Paneer Tikka Pizza (8 inch)',
    category: 'snacks',
    price: 220,
    description: 'Hand-tossed crust with spicy paneer tikka, capsicum & cheese',
    isVegetarian: true,
    isAvailable: true,
    prepTimeMinutes: 15,
  },
];

// Sanitized: Zero fake orders. Kitchen KOT board starts clean.
export const INITIAL_ORDERS: CafeOrder[] = [];
