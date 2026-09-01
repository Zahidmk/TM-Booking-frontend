"use client";

import React, { useEffect, useState, useRef } from "react";
import { formatDateDMY } from '@/lib/date';
import Modal from 'react-modal';
import { getRequests, deleteBooking, updateBooking as apiUpdateBooking } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FiPrinter, FiDownload, FiFilter, FiCalendar, FiEdit2, FiTrash2 } from "react-icons/fi";

// Strip backend-prepended "Booked on DD/MM/YYYY" prefix from remarks
// Accepts primary + optional fallback fields (deleted bookings/bookings may use 'details' or 'notes' instead of 'remarks')
const cleanRemarks = (remarks?: string, details?: string, notes?: string): string => {
  const raw = remarks || details || notes || '';
  if (!raw) return '';
  return raw.replace(/^Booked on[^\n]*\n?/i, '').trim();
};

type Booking = {
  id: number;
  name: string;
  details?: string;
  notes?: string;
  occasion_type?: string;
  payment_mode?: string;
  advance_amount?: string;
  slot_id: number;
  date?: string;
  time?: string;
  created_at?: string;
  total_amount?: string;
  phone?: string;
  payment_type?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_phone2?: string;
  groom_name?: string;
  bride_name?: string;
  address?: string;
  night?: string;
  utensil?: string;
  final_payment?: string;
  remarks?: string;
  balance_amount?: number;
};

export default function BookingsPage() {
  // Set react-modal app element for accessibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const appRoot = document.getElementById('__next');
      if (appRoot) {
        Modal.setAppElement(appRoot);
      }
    }
  }, []);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Local state for form fields
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerPhone2, setEditCustomerPhone2] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAdvanceAmount, setEditAdvanceAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<'bank' | 'cash' | 'upi'>('cash');
  const [editUtensil, setEditUtensil] = useState('');
  const [editFinalPayment, setEditFinalPayment] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editNight, setEditNight] = useState<'Yes' | 'No'>('No');

  // Check if Night option is already booked by another event on the same date
  const isNightTakenOnDate = editingBooking ? bookings.some(b => 
    String(b.id) !== String(editingBooking.id) &&
    b.date && editingBooking.date &&
    String(b.date).slice(0, 10) === String(editingBooking.date).slice(0, 10) &&
    (b.night === 'Yes' || b.night === 'yes')
  ) : false;
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getRequests(token);
        if (Array.isArray(data)) {
          // Calculate balance for each booking
          const bookingsWithBalance = data.map((b: Booking) => ({
            ...b,
            balance_amount: (parseFloat(String(b.total_amount)) || 0) - (parseFloat(String(b.advance_amount)) || 0)
          }));
          // Sort by event date
          bookingsWithBalance.sort((a: Booking, b: Booking) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          });
          setBookings(bookingsWithBalance);
        } else {
          setBookings([]);
        }
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // When opening modal, sync local state with booking
  React.useEffect(() => {
    if (editModalOpen && editingBooking) {
      setEditCustomerName(editingBooking.customer_name || editingBooking.name || '');
      setEditCustomerPhone(editingBooking.customer_phone || editingBooking.phone || '');
      setEditCustomerPhone2(editingBooking.customer_phone2 || '');
      setEditAddress(editingBooking.address || '');
      setEditAdvanceAmount(editingBooking.advance_amount || '');
      setEditPaymentMode(editingBooking.payment_mode as 'bank' | 'cash' | 'upi' || 'cash');
      setEditUtensil(editingBooking.utensil || '');
      setEditFinalPayment(editingBooking.final_payment || '');
      setEditRemarks(cleanRemarks(editingBooking.remarks, editingBooking.details, editingBooking.notes));
      setEditNight(editingBooking.night === 'Yes' || editingBooking.night === 'yes' ? 'Yes' : 'No');
    }
  }, [editModalOpen, editingBooking]);

  // Handle update submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBooking) return;
    const token = getToken();
    if (!token) return;
    
    const updates = {
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      customerPhone2: editCustomerPhone2,
      address: editAddress,
      advance_amount: editAdvanceAmount,
      payment_mode: editPaymentMode,
      utensil: editUtensil,
      final_payment: editFinalPayment,
      remarks: editRemarks,
      night: editNight,
    };
    
    try {
      await apiUpdateBooking(String(editingBooking.id), updates, token);
      // Refresh bookings
      const data = await getRequests(token);
      if (Array.isArray(data)) {
        const bookingsWithBalance = data.map((b: Booking) => ({
          ...b,
          balance_amount: (parseFloat(String(b.total_amount)) || 0) - (parseFloat(String(b.advance_amount)) || 0)
        }));
        bookingsWithBalance.sort((a: Booking, b: Booking) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        setBookings(bookingsWithBalance);
      }
      setEditModalOpen(false);
    } catch {
      alert('Failed to update booking.');
    }
  }

  // Filter bookings based on search and date filters
  const filteredBookings = bookings.filter(b => {
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const searchFields = [
        b.name,
        b.customer_name,
        b.groom_name,
        b.bride_name,
        b.phone,
        b.customer_phone,
        String(b.id),
        b.occasion_type,
        b.remarks,
        b.details,
        b.notes
      ];
      const matches = searchFields.some(f => (f || '').toLowerCase().includes(q));
      if (!matches) return false;
    }
    
    // From date filter (event date)
    if (fromDate && b.date) {
      if (new Date(b.date) < new Date(fromDate)) return false;
    }
    
    // To date filter (event date)
    if (toDate && b.date) {
      if (new Date(b.date) > new Date(toDate)) return false;
    }
    
    // Booking date filter
    if (bookingDate && b.created_at) {
      if (!b.created_at.startsWith(bookingDate)) return false;
    }
    
    return true;
  });

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setBookingDate('');
    setSearch('');
    setShowFilters(false);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Log - TM Mahal</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px;
              font-size: 11px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #1e40af;
              padding-bottom: 15px;
            }
            .header h1 { 
              color: #1e40af; 
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header p { color: #666; font-size: 12px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
              font-size: 10px;
            }
            th { 
              background: #1e40af; 
              color: white; 
              padding: 10px 6px; 
              text-align: left;
              font-weight: 600;
            }
            td { 
              padding: 8px 6px; 
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) { background: #f8fafc; }
            tr:hover { background: #e0e7ff; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 10px; 
              color: #666;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TM MAHAL</h1>
            <p>Event Booking Log</p>
            <p style="margin-top: 5px;">
              ${fromDate || toDate ? `Date Range: ${fromDate ? formatDateDMY(fromDate) : 'All'} - ${toDate ? formatDateDMY(toDate) : 'Present'}` : 'All Bookings'}
            </p>
            <p style="margin-top: 3px; color: #888;">Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Event Date</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th class="text-right">Total Amt</th>
                <th class="text-center">Night</th>
                <th class="text-right">Advance</th>
                <th class="text-right">Balance</th>
                <th>Utensil</th>
                <th class="text-right">Final Pay</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBookings.map(b => `
                <tr>
                  <td>${b.date ? formatDateDMY(b.date) : '-'}</td>
                  <td>${b.customer_name || b.name || '-'}</td>
                  <td>${b.phone || b.customer_phone || '-'}</td>
                  <td class="text-right">₹${(parseFloat(String(b.total_amount)) || 0).toLocaleString()}</td>
                  <td class="text-center">${b.night || 'No'}</td>
                  <td class="text-right">₹${(parseFloat(String(b.advance_amount)) || 0).toLocaleString()}</td>
                  <td class="text-right">₹${(b.balance_amount || 0).toLocaleString()}</td>
                  <td>${b.utensil || '-'}</td>
                  <td class="text-right">${b.final_payment ? `₹${parseFloat(String(b.final_payment)).toLocaleString()}` : '-'}</td>
                  <td>${cleanRemarks(b.remarks, b.details, b.notes) || '-'}</td>
                </tr>
              `).join('') || '<tr><td colspan="10" class="text-center">No bookings found</td></tr>'}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This is a computer-generated report. No signature required.</p>
            <p style="margin-top: 5px;">© ${new Date().getFullYear()} TM Mahal - Event Booking Management System</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportCSV = () => {
    if (!filteredBookings.length) return;
    
    const headers = [
      "Event Date",
      "Customer Name",
      "Phone",
      "Total Amount",
      "Night",
      "Advance Amount",
      "Balance Amount",
      "Utensil",
      "Final Payment",
      "Remarks"
    ];
    
    const rows = filteredBookings.map(b => [
      b.date ? formatDateDMY(b.date) : "",
      b.customer_name || b.name || "",
      b.phone || b.customer_phone || "",
      parseFloat(String(b.total_amount)) || 0,
      b.night || "No",
      parseFloat(String(b.advance_amount)) || 0,
      b.balance_amount || 0,
      b.utensil || "",
      parseFloat(String(b.final_payment)) || 0,
      cleanRemarks(b.remarks, b.details, b.notes) || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `event-log-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleDelete = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    const token = getToken();
    if (!token) return;
    
    try {
      await deleteBooking(String(booking.id), token);
      setBookings(bookings.filter(b => b.id !== booking.id));
    } catch {
      alert('Failed to delete booking.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading event log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Edit Booking Modal */}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
        contentLabel="Edit Booking"
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
      >
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Booking</h2>
          {editingBooking && (
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone 1</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={e => setEditCustomerPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone 2</label>
                <input
                  type="text"
                  value={editCustomerPhone2}
                  onChange={e => setEditCustomerPhone2(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                  maxLength={140}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label>
                <input
                  type="number"
                  value={editAdvanceAmount}
                  onChange={e => setEditAdvanceAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={e => setEditPaymentMode(e.target.value as 'bank' | 'cash' | 'upi')}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utensil</label>
                <select
                  value={editUtensil}
                  onChange={e => setEditUtensil(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Night Option
                  {isNightTakenOnDate && (
                    <span className="ml-1 text-xs text-amber-600 font-semibold">(Booked on date)</span>
                  )}
                </label>
                <select
                  value={editNight}
                  onChange={e => setEditNight(e.target.value as 'Yes' | 'No')}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                >
                  <option value="No">No</option>
                  <option value="Yes" disabled={isNightTakenOnDate && editNight !== 'Yes'}>
                    Yes {isNightTakenOnDate && editNight !== 'Yes' ? '(Unavailable)' : ''}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Payment</label>
                <input
                  type="number"
                  value={editFinalPayment}
                  onChange={e => setEditFinalPayment(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 border-gray-300 text-gray-900"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Log</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage all bookings ordered by event date</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
          >
            <FiFilter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <FiPrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiCalendar className="text-blue-600" />
            Filters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, phone, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date (Event)</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date (Event)</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {filteredBookings.map(b => (
          <div
            key={b.id}
            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">#{b.id}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                b.night === 'Yes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                Night: {b.night || 'No'}
              </span>
            </div>
            
            {/* Main info */}
            <div className="mb-3">
              <div className="font-semibold text-gray-900">{b.customer_name || b.name || '-'}</div>
              <div className="text-sm text-gray-600">{b.phone || b.customer_phone || '-'}</div>
            </div>
            
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-gray-500">Event Date</span>
                <div className="font-medium text-gray-900">{b.date ? formatDateDMY(b.date) : '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">Total</span>
                <div className="font-medium text-gray-900">₹{(parseFloat(String(b.total_amount)) || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Advance</span>
                <div className="font-medium text-gray-900">₹{(parseFloat(String(b.advance_amount)) || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Balance</span>
                <div className="font-medium text-amber-600">₹{(b.balance_amount || 0).toLocaleString()}</div>
              </div>
            </div>
            
            {cleanRemarks(b.remarks, b.details, b.notes) && (
              <div className="text-sm text-gray-500 mb-3 truncate">
                <span className="font-medium">Remarks:</span> {cleanRemarks(b.remarks, b.details, b.notes)}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 border-t pt-3">
              <button
                className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:text-green-800 font-medium text-sm border border-green-200 rounded-lg px-3 py-2 hover:bg-green-50"
                onClick={() => {
                  setEditingBooking(b);
                  setEditModalOpen(true);
                }}
              >
                <FiEdit2 className="w-4 h-4" /> Edit
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1 text-red-600 hover:text-red-800 font-medium text-sm border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50"
                onClick={() => handleDelete(b)}
              >
                <FiTrash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        ))}
        {filteredBookings.length === 0 && (
          <div className="text-center py-8 text-gray-400">No bookings found</div>
        )}
      </div>

      {/* Desktop Data Table */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden hidden md:block">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Booking Details</h3>
          <p className="text-sm text-gray-500">Ordered by Event Date • {filteredBookings.length} bookings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Event Date</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Customer Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Phone</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700">Total Amt</th>
                <th className="py-3 px-4 text-center font-semibold text-gray-700">Night</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700">Advance</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700">Balance</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Utensil</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700">Final Pay</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Remarks</th>
                <th className="py-3 px-4 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400">
                    No bookings found. Adjust your filters or create new bookings.
                  </td>
                </tr>
              )}
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">
                    {booking.date ? formatDateDMY(booking.date) : '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{booking.customer_name || booking.name || '-'}</td>
                  <td className="py-3 px-4 text-gray-700">{booking.phone || booking.customer_phone || '-'}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-medium">
                    ₹{(parseFloat(String(booking.total_amount)) || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      booking.night === 'Yes' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {booking.night || 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    ₹{(parseFloat(String(booking.advance_amount)) || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 font-medium">
                    ₹{(booking.balance_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{booking.utensil || '-'}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">
                    {booking.final_payment ? `₹${parseFloat(String(booking.final_payment)).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-500 max-w-[150px] truncate" title={cleanRemarks(booking.remarks, booking.details, booking.notes)}>
                    {cleanRemarks(booking.remarks, booking.details, booking.notes) || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Booking"
                        onClick={() => {
                          setEditingBooking(booking);
                          setEditModalOpen(true);
                        }}
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Booking"
                        onClick={() => handleDelete(booking)}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
