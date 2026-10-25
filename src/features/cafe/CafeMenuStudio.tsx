/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useCafe } from '../../context/CafeContext';
import { MenuItem, CafeCategory } from '../../types/cafe.types';
import { formatINR } from '../../utils/formatters';
import { SearchInput } from '../../components/ui/SearchInput';
import {
  Coffee,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Tag,
} from 'lucide-react';

const CATEGORY_OPTIONS: { id: CafeCategory; label: string }[] = [
  { id: 'beverages', label: 'Beverages' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'shakes', label: 'Shakes' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'sandwiches', label: 'Sandwiches' },
  { id: 'quick_bites', label: 'Quick Bites' },
  { id: 'desserts', label: 'Desserts' },
];

export const CafeMenuStudio: React.FC = () => {
  const { menu, addMenuItem, updateMenuItem, deleteMenuItem, resetMenuToDefault } = useCafe();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<CafeCategory>('beverages');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [prepTime, setPrepTime] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Statistics
  const totalItems = menu.length;
  const beveragesCount = menu.filter((m) => m.category === 'beverages').length;
  const inStockCount = menu.filter((m) => m.isAvailable).length;
  const avgPrice = totalItems > 0 ? Math.round(menu.reduce((sum, m) => sum + m.price, 0) / totalItems) : 0;

  // Filtered menu
  const filteredItems = menu.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase().trim()));
    return matchesCat && matchesSearch;
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('beverages');
    setItemPrice('');
    setItemDesc('');
    setIsVegetarian(true);
    setIsAvailable(true);
    setPrepTime('1');
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
    setPrepTime(item.prepTimeMinutes.toString());
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
        prepTimeMinutes: parseInt(prepTime, 10) || 1,
      });
      showNotification(`Updated "${itemName.trim()}" successfully.`);
    } else {
      addMenuItem({
        name: itemName.trim(),
        category: itemCategory,
        price,
        description: itemDesc.trim() || undefined,
        isVegetarian,
        isAvailable,
        prepTimeMinutes: parseInt(prepTime, 10) || 1,
      });
      showNotification(`Added "${itemName.trim()}" to menu.`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to remove "${item.name}" from the café menu?`)) {
      deleteMenuItem(item.id);
      showNotification(`Removed "${item.name}" from menu.`);
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Reset menu to standard 6 Beverages catalog (Fanta, Redbull, Amul Cool, Hell, Cola, Mineral Water)? This will remove custom additions.'
      )
    ) {
      resetMenuToDefault();
      showNotification('Menu reset to 6 standard beverages.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#15191E] text-white px-4 py-2.5 rounded-[8px] shadow-lg flex items-center gap-2 text-xs font-medium border border-[#3C4049]">
          <CheckCircle2 className="w-4 h-4 text-[#0D9926]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-[6px] font-semibold uppercase bg-[#FF5900]/10 text-[#FF5900] border border-[#FF5900]/20">
              Admin Menu Studio
            </span>
            <span className="text-xs text-[#60646C] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5900]" /> Real-time POS Synchronization
            </span>
          </div>
          <h2 className="text-xl font-medium text-[#000000] flex items-center gap-2">
            <Coffee className="w-5 h-5 text-[#FF5900]" /> Café Menu Studio & Pricing
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Configure beverages & drinks catalog, set pricing, adjust stock availability, or add custom items
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-10 px-3.5 bg-[#FFFFFF] border border-[#B9BBC6] hover:bg-[#F3F3F7] rounded-[8px] text-xs font-semibold text-[#60646C] hover:text-[#15191E] flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reset to the 6 default beverages"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Drinks</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="h-10 px-4 bg-[#FF5900] hover:bg-[#E64E00] text-white rounded-[8px] text-xs font-semibold flex items-center gap-2 shadow-[0px_2px_8px_rgba(255,89,0,0.3)] transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider">
            Total Menu Items
          </div>
          <div className="text-2xl font-mono font-bold text-[#15191E] mt-1">{totalItems}</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider">
            Beverages & Drinks
          </div>
          <div className="text-2xl font-mono font-bold text-[#006EF5] mt-1">{beveragesCount}</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider">
            In Stock
          </div>
          <div className="text-2xl font-mono font-bold text-[#0D9926] mt-1">{inStockCount}</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider">
            Average Item Price
          </div>
          <div className="text-2xl font-mono font-bold text-[#FF5900] mt-1">{formatINR(avgPrice)}</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-1.5 rounded-[6px] text-xs font-normal whitespace-nowrap transition-colors ${
              selectedCat === 'all'
                ? 'bg-[#FF5900] text-white font-medium'
                : 'bg-[#FFFFFF] hover:bg-[#15191E]/[0.04] text-[#15191E] border border-[#B9BBC6]'
            }`}
          >
            All Items ({menu.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCat('beverages')}
            className={`px-3.5 py-1.5 rounded-[6px] text-xs font-normal whitespace-nowrap transition-colors ${
              selectedCat === 'beverages'
                ? 'bg-[#FF5900] text-white font-medium'
                : 'bg-[#FFFFFF] hover:bg-[#15191E]/[0.04] text-[#15191E] border border-[#B9BBC6]'
            }`}
          >
            Beverages ({beveragesCount})
          </button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search items by name..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Menu Items Table */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-[#F3F3F7] text-[#60646C] font-semibold border-b border-[#B9BBC6] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Item Name & Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B9BBC6] text-[#15191E]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#8B8D98]">
                    No menu items found. Click "Add Menu Item" above to create one.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#15191E]/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm text-[#15191E]">{item.name}</div>
                        {item.isVegetarian && (
                          <span className="w-3.5 h-3.5 border border-[#0D9926] flex items-center justify-center rounded-[3px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926]" />
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-[#60646C] mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F3F7] border border-[#B9BBC6] text-[11px] font-medium capitalize text-[#15191E]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm text-[#15191E]">
                      {formatINR(item.price)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateMenuItem(item.id, { isAvailable: !item.isAvailable })
                        }
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors ${
                          item.isAvailable
                            ? 'bg-[#D1F4D2] text-[#0D9926] hover:bg-[#B7EBB9]'
                            : 'bg-[#F3F3F7] text-[#8B8D98] hover:bg-[#E5E5EB]'
                        }`}
                        title="Click to toggle availability"
                      >
                        {item.isAvailable ? 'In Stock' : 'Sold Out'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="w-8 h-8 rounded-[6px] bg-[#F3F3F7] border border-[#B9BBC6] hover:bg-[#FFFFFF] inline-flex items-center justify-center text-[#60646C] hover:text-[#15191E] transition-colors"
                          title="Edit item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="w-8 h-8 rounded-[6px] bg-[#FFF1F0] border border-[#FFCCC7] hover:bg-[#FF4D4F] hover:text-[#FFFFFF] inline-flex items-center justify-center text-[#CF1322] transition-colors"
                          title="Delete this item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between bg-[#F3F3F7]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#FF5900]" />
                <h3 className="text-sm font-semibold text-[#15191E]">
                  {editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Add New Menu Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-[4px] hover:bg-[#E5E5EB] flex items-center justify-center text-[#60646C] hover:text-[#15191E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
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
                  className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900] focus:ring-1 focus:ring-[#FF5900]"
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
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
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
                    className="w-full h-10 px-3 rounded-[6px] border border-[#B9BBC6] text-xs text-[#15191E] font-mono focus:outline-none focus:border-[#FF5900] focus:ring-1 focus:ring-[#FF5900]"
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
                  placeholder="e.g. Chilled sparkling orange soda (250ml)"
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
                  <span>In Stock & Available for Sale</span>
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
                  className="h-10 px-4 rounded-[6px] border border-[#B9BBC6] hover:bg-[#F3F3F7] text-xs font-medium text-[#60646C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-[6px] bg-[#FF5900] hover:bg-[#E64E00] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
