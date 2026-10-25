/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { CafeCategory, MenuItem } from '../../types/cafe.types';
import { useCafe } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';
import { SearchInput } from '../../components/ui/SearchInput';
import { formatINR } from '../../utils/formatters';
import { Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';

export const MenuCatalog: React.FC = () => {
  const { menu, addToCart, addMenuItem, updateMenuItem, deleteMenuItem } = useCafe();
  const { isAdmin } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<CafeCategory | 'all'>('beverages');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Quick Item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<CafeCategory>('beverages');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Categories: Prominently feature "Beverages" and "All Items", plus any other existing categories
  const standardCategories: { id: CafeCategory | 'all'; label: string }[] = [
    { id: 'beverages', label: 'Beverages' },
    { id: 'all', label: 'All Items' },
  ];

  // Check if any other categories exist in the current menu
  const otherCatIds = Array.from(
    new Set(menu.map((m) => m.category).filter((c) => c !== 'beverages'))
  );

  const categories = [
    ...standardCategories,
    ...otherCatIds.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' '),
    })),
  ];

  // Filtering logic
  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('beverages');
    setItemPrice('');
    setItemDesc('');
    setIsVegetarian(true);
    setIsAvailable(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemPrice(item.price.toString());
    setItemDesc(item.description || '');
    setIsVegetarian(item.isVegetarian);
    setIsAvailable(item.isAvailable);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFormError('Item name is required');
      return;
    }
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price in ₹');
      return;
    }

    if (editingItem) {
      updateMenuItem(editingItem.id, {
        name: itemName.trim(),
        category: itemCategory,
        price,
        description: itemDesc.trim() || undefined,
        isVegetarian,
        isAvailable,
      });
    } else {
      addMenuItem({
        name: itemName.trim(),
        category: itemCategory,
        price,
        description: itemDesc.trim() || undefined,
        isVegetarian,
        isAvailable,
        prepTimeMinutes: 1,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to remove "${item.name}" from the café menu?`)) {
      deleteMenuItem(item.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills & Search & Admin Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-[6px] text-xs font-normal whitespace-nowrap transition-colors duration-150 ${
                selectedCategory === cat.id
                  ? 'bg-[#FF5900] text-white font-medium shadow-none'
                  : 'bg-[#FFFFFF] hover:bg-[#15191E]/[0.04] text-[#15191E] border border-[#B9BBC6]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search drinks & items"
            className="w-full md:w-60"
          />

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="h-9 px-3 rounded-[6px] bg-[#FF5900] hover:bg-[#E64E00] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm transition-colors"
              title="Admin: Add new drink or menu item"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Menu Items */}
      {filteredMenu.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-8 text-center text-[#8B8D98]">
          <p className="text-sm">No items found in this category.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-3 px-4 py-2 bg-[#FF5900] text-white rounded-[6px] text-xs font-semibold hover:bg-[#E64E00]"
            >
              + Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between p-4 rounded-[8px] border transition-colors duration-150 relative group ${
                item.isAvailable
                  ? 'bg-[#FFFFFF] border-[#B9BBC6] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                  : 'bg-[#F3F3F7] border-[#B9BBC6] opacity-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-[#000000] leading-snug">{item.name}</h4>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.isVegetarian ? (
                      <span className="w-3.5 h-3.5 border border-[#0D9926] flex items-center justify-center rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926]" />
                      </span>
                    ) : (
                      <span className="w-3.5 h-3.5 border border-[#FF3D00] flex items-center justify-center rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3D00]" />
                      </span>
                    )}

                    {/* Admin Item Management Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="w-5 h-5 rounded hover:bg-[#E5E5EB] flex items-center justify-center text-[#60646C] hover:text-[#15191E]"
                          title="Edit item"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="w-5 h-5 rounded hover:bg-[#FFF1F0] flex items-center justify-center text-[#CF1322]"
                          title="Remove item from menu"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-[#60646C] mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#B9BBC6]">
                <span className="text-sm font-mono font-semibold text-[#15191E]">
                  {formatINR(item.price)}
                </span>

                {item.isAvailable ? (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="h-[36px] px-3.5 rounded-[6px] border border-[#15191E] bg-[#FFFFFF] hover:bg-[#FF5900] hover:border-[#FF5900] hover:text-white text-[#15191E] font-normal text-xs flex items-center gap-1.5 transition-colors duration-150"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                ) : (
                  <span className="text-xs text-[#8B8D98] font-normal">Sold Out</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Quick Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between bg-[#F3F3F7]">
              <h3 className="text-sm font-semibold text-[#15191E]">
                {editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Add New Drink or Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-[4px] hover:bg-[#E5E5EB] flex items-center justify-center text-[#60646C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-[6px] bg-[#FFF1F0] border border-[#FFCCC7] text-[#CF1322] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#15191E] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Fanta, Redbull, Cola..."
                  className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#15191E] mb-1">
                    Category *
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as CafeCategory)}
                    className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                  >
                    <option value="beverages">Beverages</option>
                    <option value="coffee">Coffee</option>
                    <option value="shakes">Shakes</option>
                    <option value="snacks">Snacks</option>
                    <option value="sandwiches">Sandwiches</option>
                    <option value="quick_bites">Quick Bites</option>
                    <option value="desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#15191E] mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] font-mono focus:outline-none focus:border-[#FF5900]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15191E] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="e.g. Chilled sparkling orange soda"
                  className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#15191E] font-medium">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-[#FF5900] rounded focus:ring-0"
                  />
                  <span>In Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#15191E] font-medium">
                  <input
                    type="checkbox"
                    checked={isVegetarian}
                    onChange={(e) => setIsVegetarian(e.target.checked)}
                    className="w-4 h-4 text-[#0D9926] rounded focus:ring-0"
                  />
                  <span>Vegetarian</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#B9BBC6]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-[6px] border border-[#B9BBC6] hover:bg-[#F3F3F7] text-xs font-medium text-[#60646C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-[6px] bg-[#FF5900] hover:bg-[#E64E00] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
