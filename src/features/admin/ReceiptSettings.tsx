/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useEffect } from 'react';
import { ReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '../../types/receipt.types';
import { getReceiptConfig, saveReceiptConfig } from '../../utils/receiptStorage';
import { printThermalReceipt } from '../../utils/printReceipt';
import { Bill } from '../../types/billing.types';
import { Button } from '../../components/ui/Button';
import {
  Printer,
  RotateCcw,
  Check,
  Sliders,
  Store,
  FileText,
  MapPin,
  User,
  Sparkles,
} from 'lucide-react';

export const ReceiptSettings: React.FC = () => {
  const [config, setConfig] = useState<ReceiptConfig>(getReceiptConfig);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setConfig(getReceiptConfig());
  }, []);

  const handleChange = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    if (confirm('Reset receipt template to default TCN factory settings?')) {
      setConfig(DEFAULT_RECEIPT_CONFIG);
      saveReceiptConfig(DEFAULT_RECEIPT_CONFIG);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  // Sample bill for interactive live preview and test print
  const sampleBill: Bill = {
    id: 'sample_bill_001',
    invoiceNumber: 'TCN-2026-1045',
    customerName: 'Kushal Pruthviraj Parakh',
    customerPhone: '+91 98220 14820',
    tableName: 'Pool Table 1',
    sessionStartTime: new Date(Date.now() - 3600000).toISOString(),
    sessionEndTime: new Date().toISOString(),
    tableCharge: 180,
    cafeCharge: 0,
    subtotal: 180,
    discountAmount: 0,
    taxGstAmount: 0,
    finalTotal: 180,
    status: 'settled',
    paymentMethod: 'upi',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    settledAt: new Date().toISOString(),
    settledByStaff: config.defaultCashierName || 'Duty Cashier',
    items: [
      {
        id: 'li_sample_table',
        type: 'table_time',
        title: 'Pool Table 1 (1 hr)',
        subtitle: 'Time: 07:27 PM - 07:29 PM (60m billed @ ₹180/hr)',
        quantity: 1,
        unitPrice: 180,
        totalPrice: 180,
      },
    ],
  };

  const handleTestPrint = () => {
    printThermalReceipt(sampleBill, config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-[#000000] flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#FF5900]" /> Receipt Template Customizer
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Customize header branding, store details, paper width, and footer notes printed on customer receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#60646C]" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            className="flex items-center gap-1.5 bg-[#FFFFFF] hover:bg-[#F3F3F7] text-[#15191E]"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF5900]" />
            <span>Test Print Receipt</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Editor & Live Thermal Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* Brand & Store Information */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#15191E] pb-2 border-b border-[#B9BBC6]">
              <Store className="w-4 h-4 text-[#FF5900]" />
              <span>Store & Brand Header</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1">
                  Venue / Business Name
                </label>
                <input
                  type="text"
                  value={config.venueName}
                  onChange={(e) => handleChange('venueName', e.target.value)}
                  placeholder="THE CUE NATION"
                  required
                  className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs font-semibold uppercase text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#15191E] mb-1">
                    Tagline / Sub-header
                  </label>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="Billiards · Snooker · Artisanal Café"
                    className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#15191E] mb-1">
                    Contact Phone / Hotline
                  </label>
                  <input
                    type="text"
                    value={config.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="+91 98220 14820"
                    className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#60646C]" />
                  <span>Address & Branch Location</span>
                </label>
                <input
                  type="text"
                  value={config.addressLine}
                  onChange={(e) => handleChange('addressLine', e.target.value)}
                  placeholder="FC Road / Senapati Bapat Marg, Pune, MH"
                  className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#60646C]" />
                  <span>Default Cashier / Staff Label</span>
                </label>
                <input
                  type="text"
                  value={config.defaultCashierName}
                  onChange={(e) => handleChange('defaultCashierName', e.target.value)}
                  placeholder="Duty Cashier"
                  className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>
            </div>
          </div>

          {/* Paper Width & Field Toggles */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#15191E] pb-2 border-b border-[#B9BBC6]">
              <Sliders className="w-4 h-4 text-[#FF5900]" />
              <span>Printer Roll & Layout Configuration</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1.5">
                  Thermal Paper Width
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F3F3F7] p-1 rounded-[6px] border border-[#B9BBC6]">
                  <button
                    type="button"
                    onClick={() => handleChange('paperWidth', '80mm')}
                    className={`h-[36px] rounded-[4px] text-xs font-medium transition-colors ${
                      config.paperWidth === '80mm'
                        ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                        : 'text-[#60646C] hover:text-[#15191E]'
                    }`}
                  >
                    80mm (Standard POS Roll)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('paperWidth', '58mm')}
                    className={`h-[36px] rounded-[4px] text-xs font-medium transition-colors ${
                      config.paperWidth === '58mm'
                        ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                        : 'text-[#60646C] hover:text-[#15191E]'
                    }`}
                  >
                    58mm (Compact Mobile Roll)
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-[6px] border border-[#B9BBC6] bg-[#F3F3F7]/50 cursor-pointer hover:bg-[#F3F3F7]">
                  <input
                    type="checkbox"
                    checked={config.showStartEndTime}
                    onChange={(e) => handleChange('showStartEndTime', e.target.checked)}
                    className="w-4 h-4 text-[#FF5900] rounded focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#15191E]">Start & End Timings</div>
                    <div className="text-[10px] text-[#60646C]">Print table duration proof times</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-[6px] border border-[#B9BBC6] bg-[#F3F3F7]/50 cursor-pointer hover:bg-[#F3F3F7]">
                  <input
                    type="checkbox"
                    checked={config.showCashier}
                    onChange={(e) => handleChange('showCashier', e.target.checked)}
                    className="w-4 h-4 text-[#FF5900] rounded focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#15191E]">Cashier Name</div>
                    <div className="text-[10px] text-[#60646C]">Display cashier on duty</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-[6px] border border-[#B9BBC6] bg-[#F3F3F7]/50 cursor-pointer hover:bg-[#F3F3F7]">
                  <input
                    type="checkbox"
                    checked={config.showPaymentMode}
                    onChange={(e) => handleChange('showPaymentMode', e.target.checked)}
                    className="w-4 h-4 text-[#FF5900] rounded focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#15191E]">Payment Mode</div>
                    <div className="text-[10px] text-[#60646C]">Print UPI, Cash, Card method</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-[6px] border border-[#B9BBC6] bg-[#F3F3F7]/50 cursor-pointer hover:bg-[#F3F3F7]">
                  <input
                    type="checkbox"
                    checked={config.showCustomerName}
                    onChange={(e) => handleChange('showCustomerName', e.target.checked)}
                    className="w-4 h-4 text-[#FF5900] rounded focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#15191E]">Customer Name</div>
                    <div className="text-[10px] text-[#60646C]">Show member/guest name</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Messages */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#15191E] pb-2 border-b border-[#B9BBC6]">
              <FileText className="w-4 h-4 text-[#FF5900]" />
              <span>Receipt Footer & Social Links</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1">
                  Primary Footer Greeting
                </label>
                <input
                  type="text"
                  value={config.footerMessage1}
                  onChange={(e) => handleChange('footerMessage1', e.target.value)}
                  placeholder="Visit Again! Keep cueing at TCN"
                  className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#15191E] mb-1">
                  Secondary Notice / Tournament Hotline
                </label>
                <input
                  type="text"
                  value={config.footerMessage2}
                  onChange={(e) => handleChange('footerMessage2', e.target.value)}
                  placeholder="For feedback or tournament entries: +91 98220 14820"
                  className="w-full h-[38px] px-3 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex items-center gap-2 bg-[#FF5900] hover:bg-[#E64E00] text-white px-6"
            >
              <Check className="w-4 h-4" />
              <span>Save & Sync Template Across Terminals</span>
            </Button>

            {isSaved && (
              <span className="text-xs font-semibold text-[#0D9926] flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4" />
                Template updated and synced!
              </span>
            )}
          </div>
        </form>

        {/* Live Thermal Receipt Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#60646C]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5900]" />
              <span>Live Thermal Print Preview ({config.paperWidth})</span>
            </span>
            <span className="text-[10px] text-[#8B8D98]">Instant WYSIWYG</span>
          </div>

          {/* The Physical Receipt Container */}
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 font-mono text-xs shadow-[0px_4px_16px_rgba(0,0,0,0.08)] space-y-3.5 max-w-[340px] mx-auto select-none">
            {/* Brand Header */}
            <div className="text-center space-y-1">
              <h2 className="text-sm font-extrabold text-[#000000] font-sans tracking-wide uppercase">
                {config.venueName || 'THE CUE NATION'}
              </h2>
              {config.tagline && (
                <div className="text-[10px] text-[#555555]">
                  {config.tagline}
                </div>
              )}
              {config.addressLine && (
                <div className="text-[9.5px] text-[#666666]">
                  {config.addressLine}
                </div>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-[#888888]" />

            {/* Meta Section */}
            <div className="space-y-1 text-[10.5px] text-[#222222]">
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Invoice No:</span>
                <span className="font-bold text-[#000000]">TCN-2026-1045</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Date & Time:</span>
                <span>25 Oct, 07:29 pm</span>
              </div>
              {config.showCustomerName && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[#444444]">Customer:</span>
                  <span className="font-bold text-[#000000]">Kushal Pruthviraj Parakh</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Table:</span>
                <span>Pool Table 1</span>
              </div>
              {config.showStartEndTime && (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#444444]">Start Time:</span>
                    <span className="font-bold text-[#000000]">07:27 PM</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#444444]">End Time:</span>
                    <span className="font-bold text-[#000000]">07:29 PM</span>
                  </div>
                </>
              )}
              {config.showCashier && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[#444444]">Cashier:</span>
                  <span>{config.defaultCashierName || 'Duty Cashier'}</span>
                </div>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-[#888888]" />

            {/* Line Items */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-[10.5px] text-[#000000] pb-0.5">
                <span>Description</span>
                <span>Amt (₹)</span>
              </div>
              <div className="text-[10.5px] text-[#15191E] space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">Pool Table 1 (1 hr)</span>
                  <span className="font-semibold text-[#000000]">180</span>
                </div>
                <div className="text-[9.5px] text-[#666666] pl-2 font-mono">
                  Time: 07:27 PM - 07:29 PM (60m billed @ ₹180/hr)
                </div>
              </div>
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-[#888888]" />

            {/* Totals */}
            <div className="space-y-1 text-[10.5px] text-[#222222]">
              <div className="flex justify-between">
                <span className="text-[#444444]">Subtotal:</span>
                <span className="font-medium">₹ 180</span>
              </div>

              <div className="flex justify-between text-xs font-extrabold text-[#000000] pt-1 font-sans items-baseline">
                <span>TOTAL PAID:</span>
                <span className="font-mono font-bold text-[#FF5900] text-sm">₹180</span>
              </div>

              {config.showPaymentMode && (
                <div className="flex justify-between text-[9.5px] text-[#555555] pt-0.5">
                  <span>Payment Mode:</span>
                  <span className="uppercase font-semibold text-[#111111]">UPI</span>
                </div>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-[#888888]" />

            {/* Footer */}
            <div className="text-center text-[9.5px] text-[#555555] space-y-0.5 pt-0.5">
              {config.footerMessage1 && <div>{config.footerMessage1}</div>}
              {config.footerMessage2 && (
                <div className="text-[9px] text-[#777777]">{config.footerMessage2}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
