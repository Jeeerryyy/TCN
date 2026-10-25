/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React from 'react';
import { Customer } from '../../types/customer.types';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useCustomers } from '../../context/CustomerContext';
import { MEMBERSHIP_BENEFITS } from '../../data/initialCustomers';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { Phone, Mail, History, Star } from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const { walletTransactions } = useCustomers();

  if (!customer) return null;

  const tierBenefit = MEMBERSHIP_BENEFITS[customer.tier];
  const customerTxns = walletTransactions.filter((tx) => tx.customerId === customer.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      subtitle={`Member ID: ${customer.id} · Member since ${customer.memberSince}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Profile Card Summary */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[6px] bg-[#15191E] text-white flex items-center justify-center font-bold text-base">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-medium text-[#000000]">{customer.name}</h3>
                <Badge variant="blue" size="sm">
                  {tierBenefit?.label || customer.tier.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[#60646C] mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#8B8D98]" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#8B8D98]" /> {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#F3F3F7] px-4 py-2 rounded-[6px] text-right border border-[#B9BBC6]">
            <div className="text-[10px] text-[#60646C] uppercase font-semibold">Prepaid Balance</div>
            <div className="text-lg font-mono font-bold text-[#0D9926]">
              {formatINR(customer.walletBalance)}
            </div>
          </div>
        </div>

        {/* Tier Privileges */}
        <div className="p-4 bg-[#D5E8FB] border border-[#006EF5]/20 rounded-[8px] flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#006EF5] fill-current" />
            <div>
              <span className="font-semibold text-[#15191E]">Tier Benefits: </span>
              <span className="text-[#15191E]">
                {tierBenefit?.tableDiscountPercent}% OFF Table Rates · {tierBenefit?.cafeDiscountPercent}% OFF Café Menu
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#006EF5] font-bold">Automatic Discount</span>
        </div>

        {/* Play History & Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-3.5 rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-[10px] text-[#60646C] uppercase font-semibold">Total Visits</div>
            <div className="text-base font-mono font-bold text-[#15191E] mt-0.5">
              {customer.totalVisits} sessions
            </div>
          </div>
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-3.5 rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-[10px] text-[#60646C] uppercase font-semibold">Lifetime Spend</div>
            <div className="text-base font-mono font-bold text-[#15191E] mt-0.5">
              {formatINR(customer.totalSpent)}
            </div>
          </div>
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-3.5 rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-[10px] text-[#60646C] uppercase font-semibold">Preferred Game</div>
            <div className="text-base font-medium capitalize text-[#15191E] mt-0.5">
              {customer.preferredGame}
            </div>
          </div>
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-3.5 rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-[10px] text-[#60646C] uppercase font-semibold">Last Visited</div>
            <div className="text-base font-mono text-[#15191E] mt-0.5 font-bold">
              {customer.lastVisit || 'Today'}
            </div>
          </div>
        </div>

        {/* Member Notes */}
        {customer.notes && (
          <div>
            <div className="text-[12px] font-semibold text-[#15191E] mb-1">Equipment & Player Notes</div>
            <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-3 text-[12px] text-[#15191E] leading-relaxed">
              {customer.notes}
            </div>
          </div>
        )}

        {/* Wallet Ledger History */}
        <div>
          <div className="text-[12px] font-semibold text-[#15191E] mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#60646C]" /> Recent Wallet Activity
          </div>
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] overflow-hidden max-h-40 overflow-y-auto shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
            {customerTxns.length === 0 ? (
              <div className="p-4 text-center text-[12px] text-[#8B8D98]">
                No recent wallet credits or debits recorded.
              </div>
            ) : (
              <table className="w-full text-left text-[12px]">
                <tbody className="divide-y divide-[#B9BBC6] text-[#15191E]">
                  {customerTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#F3F3F7] transition-colors">
                      <td className="p-3 text-[#60646C] font-mono text-[11px]">
                        {formatDateTime(txn.timestamp)}
                      </td>
                      <td className="p-3 font-medium text-[#15191E]">{txn.description}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        txn.type === 'credit' ? 'text-[#0D9926]' : 'text-[#15191E]'
                      }`}>
                        {txn.type === 'credit' ? '+ ' : '- '}
                        {formatINR(txn.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#B9BBC6]">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
};
