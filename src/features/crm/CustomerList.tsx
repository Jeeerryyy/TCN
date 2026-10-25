/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState } from 'react';
import { useCustomers } from '../../context/CustomerContext';
import { Customer, MembershipTier } from '../../types/customer.types';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatINR } from '../../utils/formatters';
import { CustomerDetailModal } from './CustomerDetailModal';
import { Users, UserPlus, Wallet, Phone } from 'lucide-react';

export const CustomerList: React.FC = () => {
  const { filteredCustomers, searchQuery, setSearchQuery, addCustomer, topUpWallet } = useCustomers();

  const [activeDetailCustomer, setActiveDetailCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [walletModalCustomer, setWalletModalCustomer] = useState<Customer | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number | ''>('');

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState<MembershipTier>('standard');
  const [newPrefGame, setNewPrefGame] = useState<'pool' | 'snooker' | 'both'>('both');
  const [newNotes, setNewNotes] = useState('');

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Name and phone number are required.');
      return;
    }

    addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      tier: newTier,
      preferredGame: newPrefGame,
      notes: newNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = typeof rechargeAmount === 'number' ? rechargeAmount : Number(rechargeAmount);
    if (!walletModalCustomer || !amt || amt <= 0) return;

    topUpWallet(walletModalCustomer.id, amt, 'Counter Cash Recharge');
    setWalletModalCustomer(null);
    setRechargeAmount('');
  };

  const getTierBadge = (tier: MembershipTier) => {
    switch (tier) {
      case 'platinum':
        return <Badge variant="blue" size="sm">PLATINUM</Badge>;
      case 'gold':
        return <Badge variant="gold" size="sm">GOLD</Badge>;
      case 'silver':
        return <Badge variant="slate" size="sm">SILVER</Badge>;
      default:
        return <Badge variant="slate" size="sm">REGULAR</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-medium text-[#000000] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF5900]" /> Member CRM & Player Profiles
          </h2>
          <p className="text-[14px] text-[#60646C] mt-0.5">
            Manage player directories, prepaid credit balances, and membership privileges
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
          className="w-full sm:w-auto h-[44px] sm:h-auto"
        >
          Register New Member
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search"
          className="w-full sm:w-96"
        />
      </div>

      {/* Customer Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 flex flex-col justify-between space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0px_4px_16px_rgba(0,0,0,0.12)] transition-shadow"
          >
            {/* Header / Identity */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[16px] font-medium text-[#000000]">{cust.name}</h4>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#60646C] font-mono mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-[#8B8D98]" />
                    <span>{cust.phone}</span>
                  </div>
                </div>
                {getTierBadge(cust.tier)}
              </div>

              {cust.notes && (
                <p className="text-[12px] text-[#15191E] italic mt-3 line-clamp-2 bg-[#F3F3F7] border border-[#B9BBC6] p-2.5 rounded-[6px]">
                  "{cust.notes}"
                </p>
              )}
            </div>

            {/* Stats Metric Bar */}
            <div className="bg-[#F3F3F7] rounded-[6px] p-3 border border-[#B9BBC6] grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-[#60646C] uppercase font-semibold">Wallet</div>
                <div className="text-[14px] font-mono font-bold text-[#0D9926] mt-0.5">
                  {formatINR(cust.walletBalance)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#60646C] uppercase font-semibold">Visits</div>
                <div className="text-[14px] font-mono font-bold text-[#15191E] mt-0.5">
                  {cust.totalVisits}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#60646C] uppercase font-semibold">Spent</div>
                <div className="text-[14px] font-mono font-bold text-[#15191E] mt-0.5">
                  {formatINR(cust.totalSpent)}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#B9BBC6]">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-h-[44px] sm:min-h-[36px]"
                onClick={() => setWalletModalCustomer(cust)}
                icon={<Wallet className="w-3.5 h-3.5 text-[#FF5900]" />}
              >
                Top-Up
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-h-[44px] sm:min-h-[36px]"
                onClick={() => setActiveDetailCustomer(cust)}
              >
                Full Profile
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Player Profile"
        subtitle="Create CRM account to record preferences, wallet balance, and visit stats"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-[#15191E] mb-1">Full Name *</label>
              <input
                type="text"
                required
                autoComplete="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] placeholder:text-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#15191E] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] placeholder:text-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#15191E] mb-1">Email (Optional)</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] placeholder:text-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#15191E] mb-1">Membership Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as MembershipTier)}
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                >
                  <option value="" disabled>Select an option</option>
                  <option value="standard">Standard (0% discount)</option>
                  <option value="silver">Silver Club (10% table, 5% cafe)</option>
                  <option value="gold">Gold Pro (15% table, 10% cafe)</option>
                  <option value="platinum">Platinum Masters (20% table, 15% cafe)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#15191E] mb-1">Primary Game</label>
                <select
                  value={newPrefGame}
                  onChange={(e) => setNewPrefGame(e.target.value as 'pool' | 'snooker' | 'both')}
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                >
                  <option value="" disabled>Select an option</option>
                  <option value="both">Both Pool & Snooker</option>
                  <option value="pool">Pool Specialist</option>
                  <option value="snooker">Snooker Enthusiast</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#15191E] mb-1">Notes / Preferences</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Enter your notes"
                className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] text-[#15191E] placeholder:text-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-[#B9BBC6]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto h-[44px] sm:h-auto">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" className="w-full sm:w-auto h-[44px] sm:h-auto">
              Save Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Wallet Top-Up Dialog */}
      <Modal
        isOpen={!!walletModalCustomer}
        onClose={() => setWalletModalCustomer(null)}
        title={`Recharge Wallet · ${walletModalCustomer?.name}`}
        subtitle={`Current balance: ${formatINR(walletModalCustomer?.walletBalance || 0)}`}
        maxWidth="sm"
      >
        <form onSubmit={handleWalletSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#15191E] mb-2">
              Select or Enter Top-Up Amount (₹)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[500, 1000, 2000, 3000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRechargeAmount(amt)}
                  className={`h-[40px] sm:h-[36px] rounded-[6px] text-[12px] font-mono font-bold transition-colors active:scale-[0.98] ${
                    rechargeAmount === amt
                      ? 'bg-[#FF5900] text-white'
                      : 'bg-[#F3F3F7] text-[#15191E] border border-[#B9BBC6] hover:bg-[#15191E]/[0.05]'
                  }`}
                >
                  ₹ {amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="100"
              step="100"
              required
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder="Enter the amount"
              className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-[14px] font-mono text-[#15191E] placeholder:text-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
            />
          </div>

          <div className="p-3 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] text-[12px] flex justify-between">
            <span className="text-[#60646C] font-medium">Balance after credit:</span>
            <span className="font-mono font-bold text-[#0D9926]">
              {formatINR((walletModalCustomer?.walletBalance || 0) + (Number(rechargeAmount) || 0))}
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-[#B9BBC6]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setWalletModalCustomer(null)} className="w-full sm:w-auto h-[44px] sm:h-auto">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" icon={<Wallet className="w-4 h-4" />} className="w-full sm:w-auto h-[44px] sm:h-auto">
              Add Credits
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Full Dossier Detail */}
      <CustomerDetailModal
        customer={activeDetailCustomer}
        isOpen={!!activeDetailCustomer}
        onClose={() => setActiveDetailCustomer(null)}
      />
    </div>
  );
};

