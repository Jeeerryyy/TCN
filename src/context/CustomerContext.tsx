import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, WalletTransaction, MembershipTier } from '../types/customer.types';
import { INITIAL_CUSTOMERS } from '../data/initialCustomers';
import { loadFromStorage, saveToStorage, clearCustomersStorage } from '../utils/storage';
import { dbService } from '../services/db';

interface AddCustomerInput {
  name: string;
  phone: string;
  email?: string;
  tier?: MembershipTier;
  preferredGame?: 'pool' | 'snooker' | 'both';
  notes?: string;
}

interface CustomerContextType {
  customers: Customer[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCustomers: Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  findCustomerByPhone: (phone: string) => Customer | undefined;
  addCustomer: (input: AddCustomerInput) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  topUpWallet: (customerId: string, amount: number, notes?: string) => void;
  deductWallet: (customerId: string, amount: number, billId: string) => boolean;
  clearAllCustomers: () => void;
  walletTransactions: WalletTransaction[];
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage('customers', INITIAL_CUSTOMERS)
  );

  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() =>
    loadFromStorage('wallet_txns', [])
  );

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    saveToStorage('customers', customers);
  }, [customers]);

  useEffect(() => {
    saveToStorage('wallet_txns', walletTransactions);
  }, [walletTransactions]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  const findCustomerByPhone = (phone: string) => {
    const clean = phone.replace(/[\s-]/g, '');
    return customers.find((c) => c.phone.replace(/[\s-]/g, '').includes(clean));
  };

  const addCustomer = (input: AddCustomerInput): Customer => {
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      tier: input.tier || 'standard',
      walletBalance: 0,
      totalVisits: 1,
      totalSpent: 0,
      preferredGame: input.preferredGame || 'both',
      memberSince: new Date().toISOString().split('T')[0],
      lastVisit: new Date().toISOString().split('T')[0],
      notes: input.notes,
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    dbService.syncCustomer(newCustomer);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          dbService.syncCustomer(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const topUpWallet = (customerId: string, amount: number, notes?: string) => {
    if (amount <= 0) return;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBal = c.walletBalance + amount;
          const txn: WalletTransaction = {
            id: `wtx_${Date.now()}`,
            customerId,
            type: 'credit',
            amount,
            description: notes || 'Prepaid Wallet Recharge',
            timestamp: new Date().toISOString(),
            balanceAfter: newBal,
          };
          setWalletTransactions((txns) => [txn, ...txns]);
          const updated = { ...c, walletBalance: newBal };
          dbService.syncCustomer(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deductWallet = (customerId: string, amount: number, billId: string): boolean => {
    const customer = getCustomerById(customerId);
    if (!customer || customer.walletBalance < amount) {
      return false;
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBal = c.walletBalance - amount;
          const txn: WalletTransaction = {
            id: `wtx_${Date.now()}`,
            customerId,
            type: 'debit',
            amount,
            description: `Payment for Bill #${billId}`,
            timestamp: new Date().toISOString(),
            balanceAfter: newBal,
            referenceBillId: billId,
          };
          setWalletTransactions((txns) => [txn, ...txns]);
          const updated = { ...c, walletBalance: newBal };
          dbService.syncCustomer(updated);
          return updated;
        }
        return c;
      })
    );

    return true;
  };

  const clearAllCustomers = () => {
    setCustomers([]);
    setWalletTransactions([]);
    clearCustomersStorage();
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        searchQuery,
        setSearchQuery,
        filteredCustomers,
        getCustomerById,
        findCustomerByPhone,
        addCustomer,
        updateCustomer,
        topUpWallet,
        deductWallet,
        clearAllCustomers,
        walletTransactions,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
