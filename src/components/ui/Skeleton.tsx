/* Brex & Apple Design System – High-Performance Shimmer Skeletons */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
  style,
}) => {
  const variantClass = {
    text: 'rounded-[4px] h-4',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-[8px]',
  }[variant];

  return (
    <div
      className={`skeleton-shimmer bg-[#E4E6EE]/80 ${variantClass} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

/* --- TABLE CARD SKELETON --- */
export const TableCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-4 flex flex-col justify-between shadow-[0px_2px_8px_rgba(0,0,0,0.06)] h-[290px]">
      <div>
        {/* Table Felt Header Shimmer */}
        <div className="h-14 w-full bg-[#E4E6EE]/60 rounded-[8px] p-2 flex items-center justify-between mb-3 border border-[#B9BBC6]/40 skeleton-shimmer">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="w-7 h-7" />
            <div>
              <Skeleton width={55} height={14} className="mb-1" />
              <Skeleton width={75} height={10} />
            </div>
          </div>
          <Skeleton width={60} height={22} className="rounded-full" />
        </div>

        {/* Info Rows */}
        <div className="space-y-2 mt-3">
          <div className="flex justify-between items-center">
            <Skeleton width={80} height={12} />
            <Skeleton width={60} height={14} />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton width={95} height={12} />
            <Skeleton width={70} height={12} />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton width={65} height={12} />
            <Skeleton width={50} height={12} />
          </div>
        </div>
      </div>

      {/* Action Buttons Shimmer */}
      <div className="pt-3 border-t border-[#B9BBC6]/40 flex gap-2">
        <Skeleton height={36} className="flex-1 rounded-[6px]" />
        <Skeleton width={36} height={36} className="rounded-[6px]" />
      </div>
    </div>
  );
};

/* --- FLOOR PLAN SKELETON --- */
export const FloorPlanSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Filter and Stats Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton width={80} height={34} className="rounded-[6px]" />
          <Skeleton width={95} height={34} className="rounded-[6px]" />
          <Skeleton width={105} height={34} className="rounded-[6px]" />
          <Skeleton width={90} height={34} className="rounded-[6px]" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width={110} height={34} className="rounded-[6px]" />
          <Skeleton width={90} height={34} className="rounded-[6px]" />
        </div>
      </div>

      {/* Grid of Table Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <TableCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/* --- DASHBOARD SKELETON --- */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#B9BBC6] space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton width={90} height={14} />
              <Skeleton variant="circular" className="w-8 h-8" />
            </div>
            <Skeleton width={120} height={28} />
            <Skeleton width={140} height={12} />
          </div>
        ))}
      </div>

      {/* Middle Section: Quick Operations & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#FFFFFF] p-5 rounded-[10px] border border-[#B9BBC6] space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton width={160} height={18} />
            <Skeleton width={80} height={14} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-[#F3F3F7] rounded-[8px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" className="w-9 h-9" />
                  <div>
                    <Skeleton width={120} height={14} className="mb-1" />
                    <Skeleton width={80} height={11} />
                  </div>
                </div>
                <Skeleton width={70} height={24} className="rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel: KOT & Alerts */}
        <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#B9BBC6] space-y-4">
          <Skeleton width={140} height={18} />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border border-[#B9BBC6]/40 rounded-[8px] space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton width={70} height={14} />
                  <Skeleton width={50} height={12} />
                </div>
                <Skeleton width={130} height={12} />
                <Skeleton width={90} height={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- CAFE POS SKELETON --- */
export const CafePOSSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Left 8 cols: Category bar & Menu Grid */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {/* Category pills */}
        <div className="flex gap-2 overflow-hidden py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width={90} height={36} className="rounded-[8px] shrink-0" />
          ))}
        </div>

        {/* Search & Filter */}
        <Skeleton height={42} className="rounded-[8px] w-full" />

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3 space-y-2">
              <Skeleton height={90} className="w-full rounded-[6px]" />
              <Skeleton width="85%" height={14} />
              <div className="flex justify-between items-center pt-1">
                <Skeleton width={50} height={16} />
                <Skeleton width={32} height={28} className="rounded-[6px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 4 cols: Cart Drawer */}
      <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#B9BBC6]">
            <Skeleton width={110} height={18} />
            <Skeleton width={40} height={14} />
          </div>
          <Skeleton height={38} className="w-full rounded-[6px]" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-[#F3F3F7] rounded-[6px]">
                <div>
                  <Skeleton width={90} height={13} className="mb-1" />
                  <Skeleton width={40} height={10} />
                </div>
                <Skeleton width={60} height={20} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#B9BBC6]">
          <div className="flex justify-between">
            <Skeleton width={70} height={14} />
            <Skeleton width={60} height={14} />
          </div>
          <Skeleton height={44} className="w-full rounded-[8px]" />
        </div>
      </div>
    </div>
  );
};

/* --- KITCHEN ORDERS SKELETON --- */
export const KitchenOrdersSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <Skeleton width={180} height={22} />
        <div className="flex gap-2">
          <Skeleton width={100} height={32} className="rounded-[6px]" />
          <Skeleton width={100} height={32} className="rounded-[6px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Queued Orders', 'In Preparation', 'Ready for Delivery'].map((_title, colIdx) => (
          <div key={colIdx} className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#B9BBC6]">
              <Skeleton width={110} height={16} />
              <Skeleton variant="circular" className="w-6 h-6" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 bg-[#F3F3F7] rounded-[8px] border border-[#B9BBC6]/40 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton width={65} height={14} />
                  <Skeleton width={50} height={12} />
                </div>
                <Skeleton width={120} height={12} />
                <Skeleton width={100} height={12} />
                <div className="pt-2 border-t border-[#B9BBC6]/40 flex justify-end">
                  <Skeleton width={80} height={28} className="rounded-[6px]" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- CUSTOMER CRM SKELETON --- */
export const CustomerListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Top Search & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <Skeleton width={260} height={38} className="rounded-[6px]" />
        <div className="flex gap-2">
          <Skeleton width={110} height={38} className="rounded-[6px]" />
          <Skeleton width={130} height={38} className="rounded-[6px]" />
        </div>
      </div>

      {/* Customer List Rows */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] overflow-hidden">
        <div className="p-4 bg-[#F3F3F7] border-b border-[#B9BBC6] flex justify-between">
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={14} />
        </div>
        <div className="divide-y divide-[#B9BBC6]/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-10 h-10" />
                <div>
                  <Skeleton width={130} height={15} className="mb-1" />
                  <Skeleton width={90} height={12} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Skeleton width={75} height={22} className="rounded-full" />
                <Skeleton width={80} height={16} />
                <Skeleton width={32} height={32} className="rounded-[6px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* --- TRANSACTION & BILLING SKELETON --- */
export const TransactionHistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <div className="flex gap-2 flex-wrap">
          <Skeleton width={120} height={36} className="rounded-[6px]" />
          <Skeleton width={100} height={36} className="rounded-[6px]" />
          <Skeleton width={90} height={36} className="rounded-[6px]" />
        </div>
        <Skeleton width={140} height={36} className="rounded-[6px]" />
      </div>

      {/* Ledger Table Shimmer */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] overflow-hidden">
        <div className="px-6 py-3.5 bg-[#F3F3F7] border-b border-[#B9BBC6] flex justify-between">
          <Skeleton width={120} height={14} />
          <Skeleton width={90} height={14} />
        </div>
        <div className="divide-y divide-[#B9BBC6]/40">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton width={110} height={15} />
                <Skeleton width={150} height={11} />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton width={80} height={20} className="rounded-full" />
                <Skeleton width={85} height={16} />
                <Skeleton width={70} height={32} className="rounded-[6px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* --- REVENUE REPORTS SKELETON --- */
export const RevenueReportsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <Skeleton width={160} height={24} />
        <Skeleton width={180} height={36} className="rounded-[6px]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#B9BBC6] space-y-2">
            <Skeleton width={90} height={13} />
            <Skeleton width={130} height={26} />
            <Skeleton width={100} height={11} />
          </div>
        ))}
      </div>

      <div className="bg-[#FFFFFF] p-6 rounded-[10px] border border-[#B9BBC6] space-y-4">
        <Skeleton width={180} height={18} />
        <Skeleton height={200} className="w-full rounded-[8px]" />
      </div>
    </div>
  );
};

/* --- TABLE STUDIO SKELETON --- */
export const TableStudioSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <div>
          <Skeleton width={150} height={20} className="mb-1" />
          <Skeleton width={200} height={12} />
        </div>
        <Skeleton width={130} height={38} className="rounded-[6px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#B9BBC6] space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton width={100} height={16} />
              <Skeleton width={60} height={20} className="rounded-full" />
            </div>
            <Skeleton width={140} height={12} />
            <Skeleton width={110} height={12} />
            <div className="pt-3 border-t border-[#B9BBC6]/40 flex justify-end gap-2">
              <Skeleton width={60} height={30} className="rounded-[6px]" />
              <Skeleton width={60} height={30} className="rounded-[6px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- BOOKING MANAGER SKELETON --- */
export const BookingManagerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6]">
        <div>
          <Skeleton width={160} height={20} className="mb-1" />
          <Skeleton width={220} height={12} />
        </div>
        <Skeleton width={140} height={38} className="rounded-[6px]" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={70} height={60} className="rounded-[8px] shrink-0" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#B9BBC6] space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton width={80} height={14} />
              <Skeleton width={65} height={18} className="rounded-full" />
            </div>
            <Skeleton width={130} height={14} />
            <Skeleton width={100} height={12} />
            <div className="pt-2 border-t border-[#B9BBC6]/40 flex justify-end">
              <Skeleton width={80} height={30} className="rounded-[6px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
