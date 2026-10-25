/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useTables } from '../../context/TableContext';
import { TableBooking } from '../../types/table.types';
import { formatINR } from '../../utils/formatters';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  CheckCircle2,
  XCircle,
  Play,
  X,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const BookingManager: React.FC = () => {
  const { tables, bookings, addBooking, cancelBooking, checkInBooking, clearAllBookings } = useTables();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [tableId, setTableId] = useState<string>(tables[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [advanceDeposit, setAdvanceDeposit] = useState('');
  const [playersCount, setPlayersCount] = useState('2');
  const [notes, setNotes] = useState('');

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalDepositCollected = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.advanceDeposit, 0);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setStartTime('18:00');
    setDurationMinutes('60');
    setAdvanceDeposit('');
    setPlayersCount('2');
    setNotes('');
    setErrorMessage(null);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Please provide customer name and phone number.');
      return;
    }

    const selectedTable = tables.find((t) => t.id === tableId);
    if (!selectedTable) {
      setErrorMessage('Please select a valid table.');
      return;
    }

    addBooking({
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bookingDate,
      startTime,
      durationMinutes: parseInt(durationMinutes, 10) || 60,
      advanceDeposit: parseInt(advanceDeposit, 10) || 0,
      playersCount: parseInt(playersCount, 10) || 2,
      notes: notes.trim(),
    });

    setIsAddModalOpen(false);
    resetForm();
    setSuccessMessage(`Reservation for ${customerName} confirmed on ${selectedTable.name}.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCheckIn = (booking: TableBooking) => {
    const success = checkInBooking(booking.id);
    if (!success) {
      setErrorMessage(`Cannot check in: ${booking.tableName} is currently occupied or unavailable.`);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(`Session started on ${booking.tableName} for ${booking.customerName}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCancel = (booking: TableBooking) => {
    if (confirm(`Cancel reservation for ${booking.customerName}?`)) {
      cancelBooking(booking.id);
      setSuccessMessage(`Reservation #${booking.id.slice(-4)} cancelled.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-semibold text-[#FF5900] tracking-wider flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#FF5900]" /> Advance Floor Schedule
          </div>
          <h2 className="text-xl font-medium text-[#000000]">
            Table Reservations & Bookings
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Book slots in advance, record customer advance deposits, and check guests into live games.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bookings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all advance booking records? This will leave your booking schedule completely empty and clean for live reservations.')) {
                  clearAllBookings();
                  setSuccessMessage('All booking records have been cleared.');
                  setTimeout(() => setSuccessMessage(null), 3000);
                }
              }}
              className="h-[40px] px-3.5 rounded-[8px] bg-[#FFFFFF] hover:bg-[#F3F3F7] active:bg-[#15191E]/[0.08] text-[#FF3D00] text-xs font-medium transition-colors border border-[#B9BBC6] flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Bookings
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="h-[40px] px-4 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white text-sm font-normal transition-colors duration-150 border border-[rgba(66,87,138,0.15)] flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> New Reservation
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-[#D1F4D2] border border-[#0D9926]/30 rounded-[6px] p-3 text-xs font-semibold text-[#0D9926] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0D9926]" /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-[rgba(255,61,0,0.10)] border border-[#FF3D00]/30 rounded-[6px] p-3 text-xs font-semibold text-[#FF3D00] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#FF3D00]" /> {errorMessage}
        </div>
      )}

      {/* Booking Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Active Bookings
          </div>
          <div className="text-2xl font-mono font-bold text-[#FF5900]">
            {confirmedBookings.length}
          </div>
          <div className="text-[11px] text-[#8B8D98]">Scheduled upcoming reservations</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Advance Deposits
          </div>
          <div className="text-2xl font-mono font-bold text-[#0D9926]">
            {formatINR(totalDepositCollected)}
          </div>
          <div className="text-[11px] text-[#8B8D98]">Collected for upcoming games</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Total History
          </div>
          <div className="text-2xl font-mono font-bold text-[#15191E]">
            {bookings.length}
          </div>
          <div className="text-[11px] text-[#8B8D98]">Recorded booking records</div>
        </div>
      </div>

      {/* Bookings Ledger Table */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#000000]">
            Reservation Book ({bookings.length})
          </h3>
          <span className="text-xs text-[#60646C]">Sorted by schedule</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-[#8B8D98]">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#60646C]" />
            <p className="text-xs font-medium">No advance bookings recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="bg-[#F3F3F7] border-b border-[#B9BBC6] text-[#60646C] font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Table</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Advance Deposit</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B9BBC6]">
                {bookings.map((booking) => {
                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-[#15191E]/[0.02] transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-[#000000] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#FF5900]" />
                          {booking.customerName}
                        </div>
                        <div className="text-[11px] text-[#60646C] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#8B8D98]" /> {booking.customerPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#15191E]">
                        {booking.tableName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#15191E]">{booking.bookingDate}</div>
                        <div className="text-[11px] text-[#60646C] font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#FF5900]" /> {booking.startTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#60646C]">
                        {booking.durationMinutes} mins ({booking.playersCount} players)
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-[#0D9926]">
                        {formatINR(booking.advanceDeposit)}
                      </td>
                      <td className="px-6 py-4">
                        {booking.status === 'confirmed' && (
                          <Badge variant="blue" dot size="sm">Confirmed</Badge>
                        )}
                        {booking.status === 'checked-in' && (
                          <Badge variant="emerald" dot size="sm">Checked In</Badge>
                        )}
                        {booking.status === 'cancelled' && (
                          <Badge variant="slate" size="sm">Cancelled</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {booking.status === 'confirmed' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleCheckIn(booking)}
                              className="px-3 py-1.5 rounded-[6px] bg-[#D1F4D2] hover:bg-[#0D9926]/20 text-[#0D9926] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" /> Check-In
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(booking)}
                              className="p-1.5 rounded-[6px] hover:bg-[rgba(255,61,0,0.12)] text-[#FF3D00] transition-colors"
                              title="Cancel Reservation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Reservation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] shadow-[0px_12px_32px_rgba(0,0,0,0.20)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#000000]">
                New Table Reservation
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-[6px] hover:bg-[#15191E]/[0.08] text-[#60646C] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="bg-[rgba(255,61,0,0.10)] border border-[#FF3D00]/30 text-[#FF3D00] p-3 rounded-[6px] font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-xs text-[#15191E] mb-1">
                  Target Table
                </label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                >
                  <option value="" disabled>Select a table</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortCode} - {t.name} ({t.type.toUpperCase()} · ₹{t.ratePerHour}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Booking Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Duration (Minutes)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  >
                    <option value="" disabled>Select duration</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour (60 mins)</option>
                    <option value="90">1.5 Hours (90 mins)</option>
                    <option value="120">2 Hours (120 mins)</option>
                    <option value="180">3 Hours (180 mins)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Advance Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={advanceDeposit}
                    onChange={(e) => setAdvanceDeposit(e.target.value)}
                    placeholder="Enter the amount"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono font-semibold placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-xs text-[#15191E] mb-1">
                  Special Notes / Cues Request
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter your message"
                  className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#B9BBC6]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-[40px] px-4 rounded-[6px] border border-[#15191E] text-[#15191E] font-normal hover:bg-[#15191E]/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-[40px] px-5 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white font-normal transition-colors border border-[rgba(66,87,138,0.15)] shadow-none"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
