/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useTables } from '../../context/TableContext';
import { Table, TableType } from '../../types/table.types';
import { formatINR } from '../../utils/formatters';
import {
  Plus,
  Edit2,
  Trash2,
  Wrench,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const TableStudio: React.FC = () => {
  const { tables, addTable, updateTable, deleteTable, activeSessionsMap } = useTables();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [tableName, setTableName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [tableType, setTableType] = useState<TableType | ''>('');
  const [tableSize, setTableSize] = useState('');
  const [clothColor, setClothColor] = useState('');
  const [ratePerHour, setRatePerHour] = useState('');
  const [minMinutes, setMinMinutes] = useState('');
  const [locationZone, setLocationZone] = useState('');

  const poolCount = tables.filter((t) => t.type === 'pool').length;
  const snookerCount = tables.filter((t) => t.type === 'snooker').length;
  const avgRate = Math.round(
    tables.reduce((sum, t) => sum + t.ratePerHour, 0) / (tables.length || 1)
  );

  const resetForm = () => {
    setTableName('');
    setShortCode('');
    setTableType('');
    setTableSize('');
    setClothColor('');
    setRatePerHour('');
    setMinMinutes('');
    setLocationZone('');
    setErrorMessage(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (table: Table) => {
    setEditingTable(table);
    setTableName(table.name);
    setShortCode(table.shortCode);
    setTableType(table.type);
    setTableSize(table.size);
    setClothColor(table.clothColor);
    setRatePerHour(table.ratePerHour.toString());
    setMinMinutes(table.minMinutes.toString());
    setLocationZone(table.locationZone || '');
    setErrorMessage(null);
  };

  const handleSaveNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim() || !shortCode.trim()) {
      setErrorMessage('Please provide both a Table Name and a Short Code.');
      return;
    }

    if (!tableType) {
      setErrorMessage('Please select a game type.');
      return;
    }

    const rate = parseInt(ratePerHour, 10);
    const minMins = parseInt(minMinutes, 10);

    if (isNaN(rate) || rate <= 0) {
      setErrorMessage('Hourly rate must be a valid positive number.');
      return;
    }

    addTable({
      name: tableName.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      type: tableType,
      size: tableSize,
      clothColor,
      ratePerHour: rate,
      minMinutes: isNaN(minMins) ? 60 : minMins,
      locationZone,
    });

    setIsAddModalOpen(false);
    resetForm();
    setSuccessMessage(`Table "${tableName}" added successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveEditTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    if (!tableType) {
      setErrorMessage('Please select a game type.');
      return;
    }

    const rate = parseInt(ratePerHour, 10);
    const minMins = parseInt(minMinutes, 10);

    if (isNaN(rate) || rate <= 0) {
      setErrorMessage('Hourly rate must be a valid positive number.');
      return;
    }

    updateTable(editingTable.id, {
      name: tableName.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      type: tableType,
      size: tableSize,
      clothColor,
      ratePerHour: rate,
      minMinutes: isNaN(minMins) ? 60 : minMins,
      locationZone,
    });

    setEditingTable(null);
    resetForm();
    setSuccessMessage(`Table "${tableName}" updated successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDelete = (table: Table) => {
    if (confirm(`Are you sure you want to delete ${table.name}?`)) {
      const res = deleteTable(table.id);
      if (!res.success) {
        setErrorMessage(res.message || 'Failed to delete table.');
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        setSuccessMessage(`Table ${table.name} has been removed.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  };

  const handleToggleMaintenance = (table: Table) => {
    if (table.status === 'occupied' || table.status === 'paused') {
      setErrorMessage(`Cannot mark ${table.name} under maintenance while session is live.`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const newStatus = table.status === 'maintenance' ? 'available' : 'maintenance';
    updateTable(table.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-semibold text-[#FF5900] tracking-wider flex items-center gap-1.5 mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#FF5900]" /> Executive Floor Management
          </div>
          <h2 className="text-xl font-medium text-[#000000]">
            Table Studio & Arena Configuration
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Add, modify rates, configure table dimensions, and manage the billiard table inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-[40px] px-4 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white text-sm font-normal transition-colors duration-150 border border-[rgba(66,87,138,0.15)] flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Table
        </button>
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

      {/* Arena Inventory Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Total Arena Tables
          </div>
          <div className="text-2xl font-mono font-bold text-[#15191E]">{tables.length}</div>
          <div className="text-[11px] text-[#8B8D98]">Pool & Snooker boards active</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Pool Tables
          </div>
          <div className="text-2xl font-mono font-bold text-[#FF5900]">{poolCount}</div>
          <div className="text-[11px] text-[#8B8D98]">Standard 7ft & 8ft Pro Series</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Snooker Tables
          </div>
          <div className="text-2xl font-mono font-bold text-[#006EF5]">{snookerCount}</div>
          <div className="text-[11px] text-[#8B8D98]">10ft & 12ft Championship Riley</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-1 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-[#60646C] font-semibold uppercase tracking-wider">
            Average Hourly Rate
          </div>
          <div className="text-2xl font-mono font-bold text-[#0D9926]">{formatINR(avgRate)}/hr</div>
          <div className="text-[11px] text-[#8B8D98]">Across all active inventory</div>
        </div>
      </div>

      {/* Editable Table Catalog List */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#000000]">
            Configured Tables ({tables.length})
          </h3>
          <span className="text-xs text-[#60646C]">Real-time operational status</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="bg-[#F3F3F7] border-b border-[#B9BBC6] text-[#60646C] font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Table Name</th>
                <th className="px-6 py-3">Type & Size</th>
                <th className="px-6 py-3">Cloth / Felt</th>
                <th className="px-6 py-3">Hourly Rate</th>
                <th className="px-6 py-3">Min Duration</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B9BBC6]">
              {tables.map((table) => {
                const hasSession = !!activeSessionsMap[table.id];
                return (
                  <tr
                    key={table.id}
                    className="hover:bg-[#15191E]/[0.02] transition-colors duration-150"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#FF5900]">
                      {table.shortCode}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-[#000000]">{table.name}</div>
                      <div className="text-[11px] text-[#60646C]">{table.locationZone || 'Main Hall'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium text-[#15191E]">
                        {table.type}
                      </span>
                      <div className="text-[11px] text-[#60646C]">{table.size}</div>
                    </td>
                    <td className="px-6 py-4 text-[#60646C]">
                      {table.clothColor}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-[#15191E]">
                      {formatINR(table.ratePerHour)}/hr
                    </td>
                    <td className="px-6 py-4 text-[#60646C]">
                      {table.minMinutes} mins
                    </td>
                    <td className="px-6 py-4">
                      {table.status === 'available' && (
                        <Badge variant="emerald" dot size="sm">Available</Badge>
                      )}
                      {table.status === 'occupied' && (
                        <Badge variant="rose" dot size="sm">Live Session</Badge>
                      )}
                      {table.status === 'paused' && (
                        <Badge variant="amber" dot size="sm">Paused</Badge>
                      )}
                      {table.status === 'maintenance' && (
                        <Badge variant="slate" size="sm">Maintenance</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMaintenance(table)}
                          title="Toggle Maintenance"
                          className="p-1.5 rounded-[6px] border border-[#B9BBC6] bg-[#FFFFFF] hover:bg-[#F3F3F7] text-[#60646C] hover:text-[#15191E] transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(table)}
                          title="Edit Table Details"
                          className="p-1.5 rounded-[6px] bg-[#D5E8FB] hover:bg-[#006EF5]/20 text-[#006EF5] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={hasSession}
                          onClick={() => handleDelete(table)}
                          title={hasSession ? 'Cannot delete live table' : 'Delete Table'}
                          className={`p-1.5 rounded-[6px] transition-colors ${
                            hasSession
                              ? 'bg-[#F3F3F7] text-[#8B8D98] cursor-not-allowed opacity-50'
                              : 'bg-[rgba(255,61,0,0.12)] hover:bg-[rgba(255,61,0,0.20)] text-[#FF3D00]'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Table (Brex Elevated Modal 10px radius) */}
      {(isAddModalOpen || editingTable) && (
        <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] shadow-[0px_12px_32px_rgba(0,0,0,0.20)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#B9BBC6] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#000000]">
                {editingTable ? `Edit ${editingTable.name}` : 'Add New Billiard / Snooker Table'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTable(null);
                }}
                className="p-1.5 rounded-[6px] hover:bg-[#15191E]/[0.08] text-[#60646C] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={editingTable ? handleSaveEditTable : handleSaveNewTable}
              className="p-6 space-y-4 text-xs"
            >
              {errorMessage && (
                <div className="bg-[rgba(255,61,0,0.10)] border border-[#FF3D00]/30 text-[#FF3D00] p-3 rounded-[6px] font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Table Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Enter table name"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Short Code (2-3 chars)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    placeholder="Enter short code"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono font-bold uppercase placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Game Type
                  </label>
                  <select
                    value={tableType}
                    onChange={(e) => setTableType(e.target.value as TableType)}
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  >
                    <option value="" disabled>Select game type</option>
                    <option value="pool">Pool Table</option>
                    <option value="snooker">Snooker Table</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Table Size
                  </label>
                  <input
                    type="text"
                    value={tableSize}
                    onChange={(e) => setTableSize(e.target.value)}
                    placeholder="Enter table size"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Hourly Rate (₹ INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    step={10}
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(e.target.value)}
                    placeholder="Enter hourly rate"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono font-semibold placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Min Duration (mins)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={minMinutes}
                    onChange={(e) => setMinMinutes(e.target.value)}
                    placeholder="Enter minimum duration"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Cloth / Felt Color
                  </label>
                  <input
                    type="text"
                    value={clothColor}
                    onChange={(e) => setClothColor(e.target.value)}
                    placeholder="Enter cloth color"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-xs text-[#15191E] mb-1">
                    Arena Location Zone
                  </label>
                  <input
                    type="text"
                    value={locationZone}
                    onChange={(e) => setLocationZone(e.target.value)}
                    placeholder="Enter location zone"
                    className="w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#B9BBC6]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTable(null);
                  }}
                  className="h-[40px] px-4 rounded-[6px] border border-[#15191E] text-[#15191E] font-normal hover:bg-[#15191E]/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-[40px] px-5 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white font-normal transition-colors border border-[rgba(66,87,138,0.15)] shadow-none"
                >
                  {editingTable ? 'Save Changes' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
