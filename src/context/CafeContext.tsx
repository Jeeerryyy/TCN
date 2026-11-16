import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, CafeOrder, OrderItem, KitchenStatus } from '../types/cafe.types';
import { INITIAL_MENU_ITEMS, INITIAL_ORDERS } from '../data/initialMenu';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { useTables } from './TableContext';
import { dbService } from '../services/db';

interface CartItem extends OrderItem {
  id: string; // generated client cart entry key
}

interface CafeContextType {
  menu: MenuItem[];
  orders: CafeOrder[];
  cart: CartItem[];
  cartDestination: 'table' | 'counter' | 'takeaway';
  selectedTableId: string;
  cartCustomerName: string;
  cartCustomerPhone: string;

  // Cart Actions
  addToCart: (item: MenuItem, notes?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCartDestination: (dest: 'table' | 'counter' | 'takeaway') => void;
  setSelectedTableId: (tableId: string) => void;
  setCartCustomerName: (name: string) => void;
  setCartCustomerPhone: (phone: string) => void;
  submitCartOrder: () => CafeOrder | null;

  // Menu Admin Actions
  toggleItemAvailability: (itemId: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (itemId: string) => void;
  resetMenuToDefault: () => void;

  // Kitchen KOT Actions
  updateOrderStatus: (orderId: string, status: KitchenStatus) => void;
  markOrdersBilled: (orderIds: string[], billId?: string) => void;
  deleteOrder: (orderId: string) => Promise<void>;
  softDeleteOrder: (orderId: string, reason: string, adminPin: string, staffName: string) => Promise<{ success: boolean; error?: string }>;

  // Table Attached Orders Management
  addItemToTableOrder: (tableId: string, item: { menuItemId?: string; name: string; price: number; quantity: number; notes?: string }) => CafeOrder;
  updateTableOrderItemQty: (orderId: string, itemIndex: number, delta: number) => void;
  removeTableOrderItem: (orderId: string, itemIndex: number) => void;

  activeKitchenOrders: CafeOrder[];
  isLoading: boolean;
  isSyncing: boolean;
}

const CafeContext = createContext<CafeContextType | undefined>(undefined);

export const CafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tables, linkCafeOrderToTable } = useTables();

  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const loaded = loadFromStorage('menu', INITIAL_MENU_ITEMS);
    const existingIds = new Set(loaded.map((m: MenuItem) => m.id));
    const missing = INITIAL_MENU_ITEMS.filter((item) => !existingIds.has(item.id));
    if (missing.length > 0) {
      const merged = [...loaded, ...missing];
      saveToStorage('menu', merged);
      return merged;
    }
    return loaded;
  });

  const [orders, setOrders] = useState<CafeOrder[]>(() =>
    loadFromStorage('orders', INITIAL_ORDERS)
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active POS cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDestination, setCartDestination] = useState<'table' | 'counter' | 'takeaway'>('counter');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [cartCustomerName, setCartCustomerName] = useState<string>('');
  const [cartCustomerPhone, setCartCustomerPhone] = useState<string>('');

  useEffect(() => {
    // 1. Fetch live menu and orders from cloud
    const syncFromCloud = () => {
      setIsSyncing(true);
      Promise.all([
        dbService.fetchMenu().then((remoteMenu) => {
          if (remoteMenu && remoteMenu.length > 0) {
            setMenu(remoteMenu);
            saveToStorage('menu', remoteMenu);
          }
        }),
        dbService.fetchOrders().then((remoteOrders) => {
          if (remoteOrders) {
            setOrders(remoteOrders);
            saveToStorage('orders', remoteOrders);
          }
        }),
      ]).finally(() => {
        setIsLoading(false);
        setIsSyncing(false);
      });
    };

    // Initial mount sync
    syncFromCloud();

    // Background 4-second cloud polling across all devices
    const pollTimer = setInterval(syncFromCloud, 4000);

    // Listen to live cafe orders
    const unsubOrder = dbService.onOrderChange((order, action) => {
      if (action === 'DELETE') {
        setOrders((prev) => {
          const next = prev.filter((o) => o.id !== order.id);
          saveToStorage('orders', next);
          return next;
        });
      } else {
        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === order.id);
          let next: CafeOrder[];
          if (idx > -1) {
            next = [...prev];
            next[idx] = order;
          } else {
            next = [order, ...prev];
          }
          saveToStorage('orders', next);
          return next;
        });
      }
    });

    // Listen to live menu changes
    const unsubMenu = dbService.onMenuChange((newMenu) => {
      if (newMenu && newMenu.length > 0) {
        setMenu(newMenu);
        saveToStorage('menu', newMenu);
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubOrder();
      unsubMenu();
    };
  }, []);

  useEffect(() => {
    saveToStorage('menu', menu);
  }, [menu]);

  useEffect(() => {
    saveToStorage('orders', orders);
  }, [orders]);

  const addToCart = (item: MenuItem, notes?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (ci) => ci.menuItemId === item.id && (ci.notes || '') === (notes || '')
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }

      return [
        ...prev,
        {
          id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes,
        },
      ];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((ci) => (ci.id === cartItemId ? { ...ci, quantity } : ci))
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartCustomerName('');
    setCartCustomerPhone('');
  };

  const submitCartOrder = (): CafeOrder | null => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;

    let tableName: string | undefined;
    if (cartDestination === 'table' && selectedTableId) {
      tableName = tables.find((t) => t.id === selectedTableId)?.name;
    }

    const newOrder: CafeOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      destination: cartDestination,
      tableId: cartDestination === 'table' ? selectedTableId : undefined,
      tableName,
      customerName: cartCustomerName || (tableName ? `Guest @ ${tableName}` : 'Counter Guest'),
      customerPhone: cartCustomerPhone || undefined,
      items: cart.map(({ menuItemId, name, price, quantity, notes }) => ({
        menuItemId,
        name,
        price,
        quantity,
        notes,
      })),
      subtotal,
      status: 'pending',
      isBilled: false,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Attach order directly to the table session so it rolls into the final bill
    if (cartDestination === 'table' && selectedTableId) {
      linkCafeOrderToTable(selectedTableId, newOrder.id);
    }

    dbService.syncOrder(newOrder);
    clearCart();
    return newOrder;
  };

  const toggleItemAvailability = (itemId: string) => {
    setMenu((prev) => {
      const next = prev.map((item) =>
        item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
      );
      saveToStorage('menu', next);
      dbService.syncMenu(next);
      return next;
    });
  };

  const addMenuItem = (itemData: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...itemData,
      id: `m_${Date.now()}`,
    };
    setMenu((prev) => {
      const next = [newItem, ...prev];
      saveToStorage('menu', next);
      dbService.syncMenu(next);
      return next;
    });
  };

  const updateMenuItem = (itemId: string, updates: Partial<MenuItem>) => {
    setMenu((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
      saveToStorage('menu', next);
      dbService.syncMenu(next);
      return next;
    });
  };

  const deleteMenuItem = (itemId: string) => {
    setMenu((prev) => {
      const next = prev.filter((item) => item.id !== itemId);
      saveToStorage('menu', next);
      dbService.syncMenu(next);
      return next;
    });
  };

  const resetMenuToDefault = () => {
    setMenu(INITIAL_MENU_ITEMS);
    saveToStorage('menu', INITIAL_MENU_ITEMS);
    dbService.syncMenu(INITIAL_MENU_ITEMS);
  };

  const updateOrderStatus = (orderId: string, status: KitchenStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updated: CafeOrder = {
            ...order,
            status,
            servedAt: status === 'served' && !order.servedAt ? new Date().toISOString() : order.servedAt,
          };
          dbService.syncOrder(updated);
          return updated;
        }
        return order;
      })
    );
  };

  const markOrdersBilled = (orderIds: string[], billId?: string) => {
    if (!orderIds || orderIds.length === 0) return;
    const idSet = new Set(orderIds);
    setOrders((prev) => {
      const next = prev.map((order) => {
        if (idSet.has(order.id)) {
          const updated: CafeOrder = {
            ...order,
            status: 'served',
            isBilled: true,
            billId: billId || order.billId,
            servedAt: order.servedAt || new Date().toISOString(),
          };
          dbService.syncOrder(updated);
          return updated;
        }
        return order;
      });
      saveToStorage('orders', next);
      return next;
    });
  };

  const deleteOrder = async (orderId: string) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      saveToStorage('orders', next);
      return next;
    });
    await dbService.deleteOrderRemote(orderId);
  };

  const softDeleteOrder = async (
    orderId: string,
    reason: string,
    _adminPin: string,
    staffName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { success: false, error: 'Order not found' };

    const updated: CafeOrder = {
      ...target,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: staffName,
      deleteReason: reason,
    };

    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? updated : o));
      saveToStorage('orders', next);
      return next;
    });

    await dbService.syncOrder(updated);
    return { success: true };
  };

  const addItemToTableOrder = (
    tableId: string,
    item: { menuItemId?: string; name: string; price: number; quantity: number; notes?: string }
  ): CafeOrder => {
    const tableName = tables.find((t) => t.id === tableId)?.name || 'Active Table';

    // Find active unbilled order for this table
    const existingOrderIndex = orders.findIndex(
      (o) => o.tableId === tableId && !o.isBilled && !o.isDeleted && o.status !== 'cancelled'
    );

    let updatedOrder: CafeOrder;

    if (existingOrderIndex > -1) {
      const existing = orders[existingOrderIndex];
      const existingItemIndex = existing.items.findIndex(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );

      let nextItems = [...existing.items];
      if (existingItemIndex > -1) {
        nextItems[existingItemIndex] = {
          ...nextItems[existingItemIndex],
          quantity: nextItems[existingItemIndex].quantity + item.quantity,
        };
      } else {
        nextItems.push({
          menuItemId: item.menuItemId || `custom_${Date.now()}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      const nextSubtotal = nextItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      updatedOrder = {
        ...existing,
        items: nextItems,
        subtotal: nextSubtotal,
      };

      setOrders((prev) => {
        const next = [...prev];
        next[existingOrderIndex] = updatedOrder;
        saveToStorage('orders', next);
        return next;
      });
    } else {
      const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;
      updatedOrder = {
        id: `ord_${Date.now()}`,
        orderNumber,
        destination: 'table',
        tableId,
        tableName,
        customerName: `Guest @ ${tableName}`,
        items: [
          {
            menuItemId: item.menuItemId || `custom_${Date.now()}`,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
          },
        ],
        subtotal: item.price * item.quantity,
        status: 'pending',
        isBilled: false,
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => {
        const next = [updatedOrder, ...prev];
        saveToStorage('orders', next);
        return next;
      });

      linkCafeOrderToTable(tableId, updatedOrder.id);
    }

    dbService.syncOrder(updatedOrder);
    return updatedOrder;
  };

  const updateTableOrderItemQty = (orderId: string, itemIndex: number, delta: number) => {
    setOrders((prev) => {
      const orderIdx = prev.findIndex((o) => o.id === orderId);
      if (orderIdx === -1) return prev;
      const order = prev[orderIdx];
      if (!order.items[itemIndex]) return prev;

      let nextItems = [...order.items];
      const newQty = nextItems[itemIndex].quantity + delta;

      if (newQty <= 0) {
        nextItems.splice(itemIndex, 1);
      } else {
        nextItems[itemIndex] = {
          ...nextItems[itemIndex],
          quantity: newQty,
        };
      }

      const nextSubtotal = nextItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const updatedOrder: CafeOrder = {
        ...order,
        items: nextItems,
        subtotal: nextSubtotal,
        status: nextItems.length === 0 ? 'cancelled' : order.status,
      };

      const nextOrders = [...prev];
      nextOrders[orderIdx] = updatedOrder;
      saveToStorage('orders', nextOrders);
      dbService.syncOrder(updatedOrder);
      return nextOrders;
    });
  };

  const removeTableOrderItem = (orderId: string, itemIndex: number) => {
    setOrders((prev) => {
      const orderIdx = prev.findIndex((o) => o.id === orderId);
      if (orderIdx === -1) return prev;
      const order = prev[orderIdx];

      const nextItems = order.items.filter((_, idx) => idx !== itemIndex);
      const nextSubtotal = nextItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const updatedOrder: CafeOrder = {
        ...order,
        items: nextItems,
        subtotal: nextSubtotal,
        status: nextItems.length === 0 ? 'cancelled' : order.status,
      };

      const nextOrders = [...prev];
      nextOrders[orderIdx] = updatedOrder;
      saveToStorage('orders', nextOrders);
      dbService.syncOrder(updatedOrder);
      return nextOrders;
    });
  };

  // Orders that are currently pending, cooking, or ready in kitchen
  const activeKitchenOrders = orders.filter(
    (o) => !o.isDeleted && (o.status === 'pending' || o.status === 'cooking' || o.status === 'ready')
  );

  return (
    <CafeContext.Provider
      value={{
        menu,
        orders,
        cart,
        cartDestination,
        selectedTableId,
        cartCustomerName,
        cartCustomerPhone,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        setCartDestination,
        setSelectedTableId,
        setCartCustomerName,
        setCartCustomerPhone,
        submitCartOrder,
        toggleItemAvailability,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        resetMenuToDefault,
        updateOrderStatus,
        markOrdersBilled,
        deleteOrder,
        softDeleteOrder,
        addItemToTableOrder,
        updateTableOrderItemQty,
        removeTableOrderItem,
        activeKitchenOrders,
        isLoading,
        isSyncing,
      }}
    >
      {children}
    </CafeContext.Provider>
  );
};

export const useCafe = (): CafeContextType => {
  const context = useContext(CafeContext);
  if (!context) {
    throw new Error('useCafe must be used within a CafeProvider');
  }
  return context;
};
