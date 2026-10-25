/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/formatters';
import { BarChart3, CreditCard, Banknote, QrCode, Wallet, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const RevenueReports: React.FC = () => {
  const { bills } = useBilling();
  const { currentUser, isAdmin } = useAuth();

  // Aggregate statistics from all settled bills
  const totalGrossRevenue = bills.reduce((sum, b) => sum + b.finalTotal, 0);
  const totalTableRevenue = bills.reduce((sum, b) => sum + b.tableCharge, 0);
  const totalCafeRevenue = bills.reduce((sum, b) => sum + b.cafeCharge, 0);
  const totalGstCollected = bills.reduce((sum, b) => sum + b.taxGstAmount, 0);
  const totalDiscountsGiven = bills.reduce((sum, b) => sum + b.discountAmount, 0);

  // Payment method totals
  const cashTotal = bills.filter((b) => b.paymentMethod === 'cash').reduce((sum, b) => sum + b.finalTotal, 0);
  const upiTotal = bills.filter((b) => b.paymentMethod === 'upi').reduce((sum, b) => sum + b.finalTotal, 0);
  const cardTotal = bills.filter((b) => b.paymentMethod === 'card').reduce((sum, b) => sum + b.finalTotal, 0);
  const walletTotal = bills.filter((b) => b.paymentMethod === 'wallet').reduce((sum, b) => sum + b.finalTotal, 0);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-[6px] font-semibold uppercase ${
              isAdmin ? 'bg-[#D5E8FB] text-[#006EF5]' : 'bg-[#D1F4D2] text-[#0D9926]'
            }`}>
              {isAdmin ? 'Manager Audit' : 'Staff Reconcile View'}
            </span>
            <span className="text-[12px] text-[#60646C] font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006EF5]" /> Authorized by {currentUser?.name || 'Administrator'}
            </span>
          </div>
          <h2 className="text-[20px] font-medium text-[#000000] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#FF5900]" /> Shift Reconciliation & Revenue Reports
          </h2>
          <p className="text-[14px] text-[#60646C] mt-0.5">
            Operational settlement audit, department breakdowns, and cash drawer balance
          </p>
        </div>

        <Button variant="secondary" size="md" onClick={handlePrintReport} icon={<Printer className="w-4 h-4" />}>
          Print Shift Audit
        </Button>
      </div>

      {/* Top 3 Department Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-[12px] font-semibold text-[#60646C] uppercase">
            Total Revenue Collected
          </div>
          <div className="text-[24px] sm:text-[28px] font-mono font-bold text-[#FF5900]">
            {formatINR(totalGrossRevenue)}
          </div>
          <div className="text-[12px] text-[#8B8D98]">
            Across {bills.length} settled invoices
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-[12px] font-semibold text-[#60646C] uppercase">
            Billiards & Snooker Play
          </div>
          <div className="text-[24px] sm:text-[28px] font-mono font-bold text-[#0D9926]">
            {formatINR(totalTableRevenue)}
          </div>
          <div className="text-[12px] text-[#8B8D98]">
            {Math.round((totalTableRevenue / (totalGrossRevenue || 1)) * 100)}% of total business
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-[12px] font-semibold text-[#60646C] uppercase">
            Café & Beverage Sales
          </div>
          <div className="text-[24px] sm:text-[28px] font-mono font-bold text-[#006EF5]">
            {formatINR(totalCafeRevenue)}
          </div>
          <div className="text-[12px] text-[#8B8D98]">
            {Math.round((totalCafeRevenue / (totalGrossRevenue || 1)) * 100)}% of total business
          </div>
        </div>
      </div>

      {/* Payment Channels and Drawer Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Channels Grid */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[14px] font-medium text-[#000000] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#FF5900]" /> Payment Channels Settlement
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#15191E]">UPI & QR Collection</div>
                  <div className="text-[11px] text-[#60646C]">Instant bank settlements</div>
                </div>
              </div>
              <span className="font-mono font-bold text-[#15191E] text-[14px]">{formatINR(upiTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#FFF3E0] text-[#FF5900] flex items-center justify-center border border-[#FF5900]/20">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#15191E]">Cash in Register Drawer</div>
                  <div className="text-[11px] text-[#60646C]">Physical drawer balance</div>
                </div>
              </div>
              <span className="font-mono font-bold text-[#15191E] text-[14px]">{formatINR(cashTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#D5E8FB] text-[#006EF5] flex items-center justify-center border border-[#006EF5]/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#15191E]">Card Swipes (POS Machine)</div>
                  <div className="text-[11px] text-[#60646C]">Credit & Debit cards</div>
                </div>
              </div>
              <span className="font-mono font-bold text-[#15191E] text-[14px]">{formatINR(cardTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#E6E2FF] text-[#3C16D5] flex items-center justify-center border border-[#3C16D5]/20">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#15191E]">Member Prepaid Credits</div>
                  <div className="text-[11px] text-[#60646C]">Debited from member balance</div>
                </div>
              </div>
              <span className="font-mono font-bold text-[#15191E] text-[14px]">{formatINR(walletTotal)}</span>
            </div>
          </div>
        </div>

        {/* Tax and Audit Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[14px] font-medium text-[#000000] flex items-center gap-2">
            Tax & Audit Summary
          </h3>

          <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-4 space-y-3 text-[12px]">
            <div className="flex justify-between text-[#60646C]">
              <span>Gross Table Billing:</span>
              <span className="font-mono font-bold text-[#15191E]">{formatINR(totalTableRevenue)}</span>
            </div>
            <div className="flex justify-between text-[#60646C]">
              <span>Gross Café & F&B Billing:</span>
              <span className="font-mono font-bold text-[#15191E]">{formatINR(totalCafeRevenue)}</span>
            </div>
            <div className="flex justify-between text-[#0D9926] font-semibold">
              <span>Total Loyalty Discounts Applied:</span>
              <span className="font-mono font-bold">- {formatINR(totalDiscountsGiven)}</span>
            </div>
            {totalGstCollected > 0 && (
              <>
                <div className="pt-2 border-t border-[#B9BBC6] flex justify-between text-[#15191E] font-medium">
                  <span>Net Taxable Base:</span>
                  <span className="font-mono font-bold text-[#15191E]">
                    {formatINR(totalGrossRevenue - totalGstCollected)}
                  </span>
                </div>
                <div className="flex justify-between text-[#60646C]">
                  <span>Output GST Collected (5%):</span>
                  <span className="font-mono font-bold text-[#15191E]">
                    {formatINR(totalGstCollected)}
                  </span>
                </div>
              </>
            )}
            <div className="pt-2 border-t border-[#B9BBC6] flex justify-between text-[14px] font-semibold text-[#15191E]">
              <span>Audited Net Deposit:</span>
              <span className="font-mono text-[20px] text-[#FF5900] font-bold">
                {formatINR(totalGrossRevenue)}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[12px] text-[#60646C] flex items-center justify-between">
            <span>Shift Cashier on Duty:</span>
            <span className="font-semibold text-[#15191E]">{currentUser?.name || 'Authorized Staff'} ({currentUser?.role?.toUpperCase() || 'STAFF'})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

