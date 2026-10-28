/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState, useMemo } from 'react';
import { useBilling } from '../../context/BillingContext';
import { useAuth } from '../../context/AuthContext';
import {
  formatINR,
  getBillDateString,
  getLocalDateString,
  formatFriendlyDate,
} from '../../utils/formatters';
import {
  BarChart3,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  Printer,
  ShieldCheck,
  Calendar,
  Sparkles,
  Coffee,
  CheckCircle2,
  Clock,
  Layers,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Bill } from '../../types/billing.types';

interface DailyRevenueRecord {
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
  totalGross: number;
  tableRevenue: number;
  cafeRevenue: number;
  discounts: number;
  gst: number;
  billCount: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  walletTotal: number;
  bills: Bill[];
}

export const RevenueReports: React.FC = () => {
  const { bills } = useBilling();
  const { currentUser, isAdmin } = useAuth();

  // Top-level View Option: 'per_day' | 'overall'
  const [reportView, setReportView] = useState<'per_day' | 'overall'>('per_day');

  // Selected date in Daily Breakdown (defaults to today's date)
  const todayStr = getLocalDateString();
  const [selectedLedgerDate, setSelectedLedgerDate] = useState<string>(todayStr);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Staff Security Guard: Never expose total revenue to staff
  if (!isAdmin) {
    return (
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-8 text-center max-w-lg mx-auto my-12 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="w-12 h-12 rounded-full bg-[#FFF1F0] text-[#FF4D4F] flex items-center justify-center mx-auto mb-4 border border-[#FFCCC7]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-[#000000]">Executive Access Required</h3>
        <p className="text-xs text-[#60646C] mt-2 leading-relaxed">
          Total revenue analytics and shift financial audits are restricted to Administrative Executives. Floor staff cannot view cumulative revenue totals.
        </p>
      </div>
    );
  }

  // --- Aggregate Statistics (All-Time / Overall) ---
  const validBills = useMemo(() => bills.filter((b) => b.status !== 'voided'), [bills]);

  const totalGrossRevenue = useMemo(
    () => validBills.reduce((sum, b) => sum + b.finalTotal, 0),
    [validBills]
  );
  const totalTableRevenue = useMemo(
    () => validBills.reduce((sum, b) => sum + b.tableCharge, 0),
    [validBills]
  );
  const totalCafeRevenue = useMemo(
    () => validBills.reduce((sum, b) => sum + b.cafeCharge, 0),
    [validBills]
  );
  const totalGstCollected = useMemo(
    () => validBills.reduce((sum, b) => sum + b.taxGstAmount, 0),
    [validBills]
  );
  const totalDiscountsGiven = useMemo(
    () => validBills.reduce((sum, b) => sum + b.discountAmount, 0),
    [validBills]
  );

  // All-time payment method totals
  const overallCashTotal = useMemo(
    () => validBills.filter((b) => b.paymentMethod === 'cash').reduce((sum, b) => sum + b.finalTotal, 0),
    [validBills]
  );
  const overallUpiTotal = useMemo(
    () => validBills.filter((b) => b.paymentMethod === 'upi').reduce((sum, b) => sum + b.finalTotal, 0),
    [validBills]
  );
  const overallCardTotal = useMemo(
    () => validBills.filter((b) => b.paymentMethod === 'card').reduce((sum, b) => sum + b.finalTotal, 0),
    [validBills]
  );
  const overallWalletTotal = useMemo(
    () => validBills.filter((b) => b.paymentMethod === 'wallet').reduce((sum, b) => sum + b.finalTotal, 0),
    [validBills]
  );

  // --- Reactive Per-Day Grouping (Live Dynamic Updates) ---
  const dailyRecords: DailyRevenueRecord[] = useMemo(() => {
    const map = new Map<string, DailyRevenueRecord>();

    // Ensure today's entry always exists even if 0 bills yet
    map.set(todayStr, {
      dateStr: todayStr,
      isToday: true,
      totalGross: 0,
      tableRevenue: 0,
      cafeRevenue: 0,
      discounts: 0,
      gst: 0,
      billCount: 0,
      cashTotal: 0,
      upiTotal: 0,
      cardTotal: 0,
      walletTotal: 0,
      bills: [],
    });

    validBills.forEach((b) => {
      const d = getBillDateString(b) || todayStr;
      let rec = map.get(d);
      if (!rec) {
        rec = {
          dateStr: d,
          isToday: d === todayStr,
          totalGross: 0,
          tableRevenue: 0,
          cafeRevenue: 0,
          discounts: 0,
          gst: 0,
          billCount: 0,
          cashTotal: 0,
          upiTotal: 0,
          cardTotal: 0,
          walletTotal: 0,
          bills: [],
        };
        map.set(d, rec);
      }
      rec.totalGross += b.finalTotal;
      rec.tableRevenue += b.tableCharge;
      rec.cafeRevenue += b.cafeCharge;
      rec.discounts += b.discountAmount;
      rec.gst += b.taxGstAmount;
      rec.billCount += 1;
      rec.bills.push(b);

      if (b.paymentMethod === 'cash') rec.cashTotal += b.finalTotal;
      else if (b.paymentMethod === 'upi') rec.upiTotal += b.finalTotal;
      else if (b.paymentMethod === 'card') rec.cardTotal += b.finalTotal;
      else if (b.paymentMethod === 'wallet') rec.walletTotal += b.finalTotal;
      else if (b.paymentMethod === 'split' && b.splitDetails) {
        b.splitDetails.forEach((s) => {
          if (s.method === 'cash') rec!.cashTotal += s.amount;
          else if (s.method === 'upi') rec!.upiTotal += s.amount;
          else if (s.method === 'card') rec!.cardTotal += s.amount;
          else if (s.method === 'wallet') rec!.walletTotal += s.amount;
        });
      }
    });

    // Sort descending by date
    return Array.from(map.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [validBills, todayStr]);

  // Today's live record
  const todayRecord = useMemo(
    () => dailyRecords.find((r) => r.isToday) || dailyRecords[0],
    [dailyRecords]
  );

  // Active ledger record being inspected in Per-Day view (defaults to today)
  const activeInspectRecord = useMemo(
    () => dailyRecords.find((r) => r.dateStr === selectedLedgerDate) || todayRecord,
    [dailyRecords, selectedLedgerDate, todayRecord]
  );

  // Filtered daily records for table
  const filteredDailyRecords = useMemo(() => {
    if (!ledgerSearch.trim()) return dailyRecords;
    const term = ledgerSearch.toLowerCase().trim();
    return dailyRecords.filter(
      (r) =>
        r.dateStr.includes(term) ||
        formatFriendlyDate(r.dateStr).toLowerCase().includes(term)
    );
  }, [dailyRecords, ledgerSearch]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Executive Header with View Option Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-[6px] font-semibold uppercase bg-[#D5E8FB] text-[#006EF5]">
              Executive Revenue Suite
            </span>
            <span className="text-[12px] text-[#60646C] font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006EF5]" /> Authorized for {currentUser?.name || 'Administrator'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-[#000000] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#FF5900]" /> Revenue & Shift Reconciliation
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Real-time daily ledger reconciliation and all-time financial business audits
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Top-Level Revenue View Switcher: Per-Day vs Overall */}
          <div className="inline-flex p-1 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[8px] text-xs font-semibold shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={() => {
                setReportView('per_day');
                setSelectedLedgerDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 transition-all ${
                reportView === 'per_day'
                  ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_2px_4px_rgba(0,0,0,0.08)]'
                  : 'text-[#60646C] hover:text-[#000000]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0D9926] animate-pulse" />
              Per-Day Revenue (Live)
            </button>
            <button
              type="button"
              onClick={() => setReportView('overall')}
              className={`px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 transition-all ${
                reportView === 'overall'
                  ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_2px_4px_rgba(0,0,0,0.08)]'
                  : 'text-[#60646C] hover:text-[#000000]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Overall Revenue
            </button>
          </div>

          <Button variant="secondary" size="md" onClick={handlePrintReport} icon={<Printer className="w-4 h-4" />}>
            Print Audit
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTION 1: PER-DAY REVENUE (LIVE REAL-TIME DAILY AUDIT)                     */}
      {/* ========================================================================= */}
      {reportView === 'per_day' && (
        <div className="space-y-6">
          {/* Live Indicator Banner */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0D9926] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0D9926] animate-pulse" /> Live Per-Day Sync
                  </span>
                  <span className="text-xs text-[#8B8D98]">·</span>
                  <span className="text-xs font-medium text-[#15191E]">
                    {formatFriendlyDate(activeInspectRecord.dateStr)} {activeInspectRecord.isToday ? '(Today)' : ''}
                  </span>
                </div>
                <p className="text-xs text-[#60646C] mt-0.5">
                  {activeInspectRecord.isToday
                    ? 'Updating live on a per-day basis as tables are cleared and food bills are settled.'
                    : `Inspecting past historical ledger for ${formatFriendlyDate(activeInspectRecord.dateStr)}.`}
                </p>
              </div>
            </div>

            {!activeInspectRecord.isToday && (
              <button
                type="button"
                onClick={() => setSelectedLedgerDate(todayStr)}
                className="px-3 py-1.5 bg-[#D1F4D2] text-[#0D9926] hover:bg-[#B3EDB6] rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center border border-[#0D9926]/30"
              >
                <Clock className="w-3.5 h-3.5" /> Back to Live Today
              </button>
            )}
          </div>

          {/* 4 Primary Daily KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Daily Card 1: Gross Revenue */}
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between text-[#60646C]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#15191E]">
                  {activeInspectRecord.isToday ? "Today's Live Revenue" : "Day's Net Revenue"}
                </span>
                <div className="w-8 h-8 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#FF5900]">
                {formatINR(activeInspectRecord.totalGross)}
              </div>
              <div className="text-[11px] text-[#0D9926] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Across {activeInspectRecord.billCount} settled tickets
              </div>
            </div>

            {/* Daily Card 2: Billiards & Snooker Play */}
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between text-[#60646C]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#15191E]">
                  Table Game Play
                </span>
                <div className="w-8 h-8 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#0D9926]">
                {formatINR(activeInspectRecord.tableRevenue)}
              </div>
              <div className="text-[11px] text-[#60646C]">
                {Math.round((activeInspectRecord.tableRevenue / (activeInspectRecord.totalGross || 1)) * 100)}% of day's intake
              </div>
            </div>

            {/* Daily Card 3: Snacks & Drinks */}
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between text-[#60646C]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#15191E]">
                  Café & Drinks Sales
                </span>
                <div className="w-8 h-8 rounded-[6px] bg-[#D5E8FB] text-[#006EF5] flex items-center justify-center border border-[#006EF5]/20">
                  <Coffee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#006EF5]">
                {formatINR(activeInspectRecord.cafeRevenue)}
              </div>
              <div className="text-[11px] text-[#60646C]">
                {Math.round((activeInspectRecord.cafeRevenue / (activeInspectRecord.totalGross || 1)) * 100)}% of day's intake
              </div>
            </div>

            {/* Daily Card 4: Discounts & Taxes */}
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between text-[#60646C]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#15191E]">
                  Discounts & GST
                </span>
                <div className="w-8 h-8 rounded-[6px] bg-[#FFF3E0] text-[#FF5900] flex items-center justify-center border border-[#FF5900]/20">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#15191E]">
                {formatINR(activeInspectRecord.gst)}
              </div>
              <div className="text-[11px] text-[#60646C]">
                Discounts given: {formatINR(activeInspectRecord.discounts)}
              </div>
            </div>
          </div>

          {/* Daily Payment Channels Breakdown */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#FF5900]" /> Payment Channels Breakdown ({formatFriendlyDate(activeInspectRecord.dateStr)})
              </h3>
              <span className="text-xs font-mono font-bold text-[#FF5900]">
                Net Total: {formatINR(activeInspectRecord.totalGross)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center justify-between p-3 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[4px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#15191E]">UPI & QR</div>
                    <div className="text-[10px] text-[#60646C]">Instant Bank</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-[#15191E]">
                  {formatINR(activeInspectRecord.upiTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[4px] bg-[#FFF3E0] text-[#FF5900] flex items-center justify-center">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#15191E]">Cash Drawer</div>
                    <div className="text-[10px] text-[#60646C]">Physical Cash</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-[#15191E]">
                  {formatINR(activeInspectRecord.cashTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[4px] bg-[#D5E8FB] text-[#006EF5] flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#15191E]">POS Card</div>
                    <div className="text-[10px] text-[#60646C]">Credit/Debit</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-[#15191E]">
                  {formatINR(activeInspectRecord.cardTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[4px] bg-[#E6E2FF] text-[#3C16D5] flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#15191E]">Member Credit</div>
                    <div className="text-[10px] text-[#60646C]">Prepaid Debit</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-[#15191E]">
                  {formatINR(activeInspectRecord.walletTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Daily Ledger Table */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FF5900]" /> Day-by-Day Historical Revenue Ledger
                </h3>
                <p className="text-xs text-[#60646C] mt-0.5">
                  Select any date to inspect historical shift breakdowns and compare daily trends
                </p>
              </div>

              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#60646C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search by date (YYYY-MM-DD)..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] focus:outline-none focus:border-[#FF5900] text-[#15191E]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#B9BBC6] rounded-[6px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F3F7] text-[#60646C] font-semibold uppercase tracking-wider text-[10px] border-b border-[#B9BBC6]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                    <th className="py-2.5 px-3 text-right">Table Play</th>
                    <th className="py-2.5 px-3 text-right">Café / Drinks</th>
                    <th className="py-2.5 px-3 text-right">Discounts</th>
                    <th className="py-2.5 px-3 text-right">Day Gross Revenue</th>
                    <th className="py-2.5 px-3 text-center">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B9BBC6]">
                  {filteredDailyRecords.map((record) => {
                    const isSelected = record.dateStr === activeInspectRecord.dateStr;
                    return (
                      <tr
                        key={record.dateStr}
                        onClick={() => setSelectedLedgerDate(record.dateStr)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#FFF8F0] font-medium'
                            : 'hover:bg-[#F3F3F7]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-[#15191E]">
                          <div className="font-semibold">{formatFriendlyDate(record.dateStr)}</div>
                          <div className="text-[10px] text-[#8B8D98] font-mono">{record.dateStr}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {record.isToday ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#D1F4D2] text-[#0D9926] px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926] animate-pulse" /> Live Today
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider bg-[#F3F3F7] text-[#60646C] px-2 py-0.5 rounded-full border border-[#B9BBC6]">
                              Closed Day
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {record.billCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#0D9926]">
                          {formatINR(record.tableRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#006EF5]">
                          {formatINR(record.cafeRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#CF1322]">
                          {record.discounts > 0 ? `- ${formatINR(record.discounts)}` : '₹ 0'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#FF5900] text-sm">
                          {formatINR(record.totalGross)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLedgerDate(record.dateStr);
                            }}
                            className={`px-2 py-1 rounded-[4px] text-[10px] font-semibold transition-colors ${
                              isSelected
                                ? 'bg-[#FF5900] text-white'
                                : 'bg-[#FFFFFF] border border-[#B9BBC6] text-[#15191E] hover:bg-[#F3F3F7]'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 2: OVERALL REVENUE (ALL-TIME MACRO FINANCIAL AUDIT)                */}
      {/* ========================================================================= */}
      {reportView === 'overall' && (
        <div className="space-y-6">
          {/* Top 3 Department Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="text-[12px] font-semibold text-[#60646C] uppercase">
                Overall Revenue Collected
              </div>
              <div className="text-[24px] sm:text-[28px] font-mono font-bold text-[#FF5900]">
                {formatINR(totalGrossRevenue)}
              </div>
              <div className="text-[12px] text-[#8B8D98]">
                Across all {validBills.length} settled invoices
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <div className="text-[12px] font-semibold text-[#60646C] uppercase">
                All-Time Billiards & Snooker Play
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
                All-Time Café & Beverage Sales
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
                <CreditCard className="w-4 h-4 text-[#FF5900]" /> All-Time Payment Channels Settlement
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#15191E]">UPI & QR Collections</div>
                      <div className="text-[11px] text-[#60646C]">Instant digital bank settlements</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#15191E] text-[14px]">
                    {formatINR(overallUpiTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#FFF3E0] text-[#FF5900] flex items-center justify-center border border-[#FF5900]/20">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#15191E]">Cash in Register Drawers</div>
                      <div className="text-[11px] text-[#60646C]">Physical cash collections</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#15191E] text-[14px]">
                    {formatINR(overallCashTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#D5E8FB] text-[#006EF5] flex items-center justify-center border border-[#006EF5]/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#15191E]">Card Swipes (POS Terminal)</div>
                      <div className="text-[11px] text-[#60646C]">Credit & Debit cards</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#15191E] text-[14px]">
                    {formatINR(overallCardTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#F3F3F7] rounded-[6px] border border-[#B9BBC6]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#E6E2FF] text-[#3C16D5] flex items-center justify-center border border-[#3C16D5]/20">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#15191E]">Member Prepaid Credits</div>
                      <div className="text-[11px] text-[#60646C]">Debited from member balances</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#15191E] text-[14px]">
                    {formatINR(overallWalletTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax and Audit Breakdown */}
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
              <h3 className="text-[14px] font-medium text-[#000000] flex items-center gap-2">
                All-Time Tax & Audit Summary
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
                  <span>Audited Overall Net Deposit:</span>
                  <span className="font-mono text-[20px] text-[#FF5900] font-bold">
                    {formatINR(totalGrossRevenue)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[12px] text-[#60646C] flex items-center justify-between">
                <span>Executive Auditor:</span>
                <span className="font-semibold text-[#15191E]">
                  {currentUser?.name || 'Administrator'} ({currentUser?.role?.toUpperCase() || 'ADMIN'})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
