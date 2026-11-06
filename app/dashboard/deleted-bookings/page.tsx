"use client";
import { useEffect, useState, useRef } from 'react';
import { getDeletedBookings, permanentlyDeleteBooking } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateDMY } from '@/lib/date';
import { FiPrinter, FiDownload, FiFilter, FiCalendar, FiTrash2 } from "react-icons/fi";

// Accepts primary + optional fallback fields (deleted bookings may use 'details' or 'notes' instead of 'remarks')
const cleanRemarks = (remarks?: string, details?: string, notes?: string): string => {
  const raw = remarks || details || notes || '';
  if (!raw) return '';
  return raw.replace(/^Booked on[^\n]*\n?/i, '').trim();
};

type DeletedBooking = {
  id: number;
  original_booking_id: number;
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  groom_name?: string;
  bride_name?: string;
  address?: string;
  details?: string;
  occasion_type?: string;
  payment_mode?: string;
  advance_amount?: string;
  total_amount?: string;
  date?: string;
  time?: string;
  deleted_at?: string;
  created_at?: string;
  night?: string;
  utensil?: string;
  final_payment?: string;
  remarks?: string;
  notes?: string;
  balance_amount?: number;
};

export default function DeletedBookingsPage() {
  const [deleted, setDeleted] = useState<DeletedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Handle permanent delete
  const handlePermanentDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) {
      return;
    }
    const token = getToken();
    if (!token) return;
    
    setDeleting(id);
    try {
      await permanentlyDeleteBooking(id, token);
      setDeleted(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete the record.');
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const fetchDeleted = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getDeletedBookings(token);
        if (Array.isArray(data)) {
          // Calculate balance and sort by event date
          const processedData = data.map((d: DeletedBooking) => ({
            ...d,
            balance_amount: (parseFloat(String(d.total_amount)) || 0) - (parseFloat(String(d.advance_amount)) || 0)
          }));
          processedData.sort((a: DeletedBooking, b: DeletedBooking) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          });
          setDeleted(processedData);
        } else {
          setDeleted([]);
        }
      } catch (err) {
        console.error('Failed to load deleted bookings:', err);
        setError('Failed to load deleted bookings');
        setDeleted([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeleted();
  }, []);

  // Filter bookings
  const filteredBookings = deleted.filter(b => {
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
        b.remarks,
        b.details,
        b.notes
      ];
      const matches = searchFields.some(f => (f || '').toLowerCase().includes(q));
      if (!matches) return false;
    }

    // From date filter
    if (fromDate && b.date) {
      if (new Date(b.date) < new Date(fromDate)) return false;
    }

    // To date filter
    if (toDate && b.date) {
      if (new Date(b.date) > new Date(toDate)) return false;
    }

    return true;
  });

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
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
            <p>Event Log (Deleted Bookings)</p>
            <p style="margin-top: 5px;">
              ${fromDate || toDate ? `Date Range: ${fromDate ? formatDateDMY(fromDate) : 'All'} - ${toDate ? formatDateDMY(toDate) : 'Present'}` : 'All Bookings'}
            </p>
            <p style="margin-top: 3px; color: #888;">Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Booked Date</th>
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
                <th>Deleted At</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBookings.map(b => `
                <tr>
                  <td>${b.created_at ? formatDateDMY(b.created_at) : '-'}</td>
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
                  <td>${b.deleted_at ? formatDateDMY(b.deleted_at) : '-'}</td>
                </tr>
              `).join('') || '<tr><td colspan="12" class="text-center">No deleted bookings found</td></tr>'}
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
      "Booked Date",
      "Event Date",
      "Customer Name",
      "Phone",
      "Total Amount",
      "Night",
      "Advance Amount",
      "Balance Amount",
      "Utensil",
      "Final Payment",
      "Remarks",
      "Deleted At"
    ];

    const rows = filteredBookings.map(b => [
      b.created_at ? formatDateDMY(b.created_at) : "",
      b.date ? formatDateDMY(b.date) : "",
      b.customer_name || b.name || "",
      b.phone || b.customer_phone || "",
      parseFloat(String(b.total_amount)) || 0,
      b.night || "No",
      parseFloat(String(b.advance_amount)) || 0,
      b.balance_amount || 0,
      b.utensil || "",
      parseFloat(String(b.final_payment)) || 0,
      cleanRemarks(b.remarks, b.details, b.notes) || "",
      b.deleted_at ? formatDateDMY(b.deleted_at) : ""
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading event log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Deleted Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">Review complete history of cancelled or deleted event bookings</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-200 border-2 whitespace-nowrap ${showFilters
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200 shadow-sm'
              }`}
          >
            <FiFilter className="w-5 h-5 flex-shrink-0" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all duration-200 shadow-lg shadow-blue-200 flex-1 sm:flex-none whitespace-nowrap"
            >
              <FiPrinter className="w-5 h-5 flex-shrink-0" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all duration-200 shadow-lg shadow-emerald-200 flex-1 sm:flex-none whitespace-nowrap"
            >
              <FiDownload className="w-5 h-5 flex-shrink-0" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-100/50 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search Booking</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleClearFilters}
              className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg font-medium border border-red-100">{error}</div>}

      {/* Data Table / Mobile Cards */}
      <div ref={printRef} className="space-y-4">
        <div className="md:bg-white bg-transparent rounded-2xl overflow-hidden">
          <div className="md:p-6 p-2 border-b border-gray-100 bg-gray-50/30">
            <h3 className="font-bold text-gray-800">Deleted Logs</h3>
            <p className="text-sm text-gray-500">History of deleted transactions ordered by Event Date</p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar w-full">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[800px]">
              <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Booked Date</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Event Date</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Customer</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Phone</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Total Amt</th>
                  <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Night</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Advance</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Balance</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Deleted At</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] border-b border-gray-100 bg-gray-50">Remarks</th>
                  <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-[10px] border-b border-gray-100 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FiCalendar className="w-10 h-10 opacity-20" />
                        <p>No deleted bookings found.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-4 px-6 text-gray-900 font-semibold whitespace-nowrap">
                      {booking.created_at ? formatDateDMY(booking.created_at) : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-900 font-semibold whitespace-nowrap">
                      {booking.date ? formatDateDMY(booking.date) : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-700 whitespace-nowrap">{booking.customer_name || booking.name || '-'}</td>
                    <td className="py-4 px-6 text-gray-700 font-medium whitespace-nowrap">{booking.phone || booking.customer_phone || '-'}</td>
                    <td className="py-4 px-6 text-right text-gray-900 font-bold whitespace-nowrap">
                      ₹{(parseFloat(String(booking.total_amount)) || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${booking.night === 'Yes'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {booking.night || 'No'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-600 font-semibold whitespace-nowrap">
                      ₹{(parseFloat(String(booking.advance_amount)) || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-rose-600 font-bold whitespace-nowrap">
                      ₹{(booking.balance_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-red-600 font-bold whitespace-nowrap">
                      {booking.deleted_at ? formatDateDMY(booking.deleted_at) : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-500 max-w-[200px] truncate italic" title={cleanRemarks(booking.remarks, booking.details, booking.notes)}>
                      {cleanRemarks(booking.remarks, booking.details, booking.notes) || '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handlePermanentDelete(booking.id)}
                        disabled={deleting === booking.id}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Permanently Delete"
                      >
                        {deleting === booking.id ? (
                          <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          <FiTrash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden flex flex-col gap-2">
            {filteredBookings.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <FiCalendar className="w-10 h-10 mx-auto opacity-20 mb-3" />
                <p>No records found.</p>
              </div>
            )}
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="p-4 bg-white hover:bg-gray-50/50 transition-colors rounded-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">
                      {booking.customer_name || booking.name || 'Unknown Guest'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      Event: {booking.date ? formatDateDMY(booking.date) : '-'}
                      {booking.created_at && <span className="ml-2">• Booked: {formatDateDMY(booking.created_at)}</span>}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                    Deleted
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Total</p>
                    <p className="text-sm font-bold text-gray-900">₹{(parseFloat(String(booking.total_amount)) || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Paid</p>
                    <p className="text-sm font-bold text-emerald-600">₹{(parseFloat(String(booking.advance_amount)) || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Due</p>
                    <p className="text-sm font-bold text-rose-600">₹{(booking.balance_amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-none">Deletion Date</span>
                    <span className="text-xs font-bold text-red-600">{booking.deleted_at ? formatDateDMY(booking.deleted_at) : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Phone</span>
                    <span className="text-xs font-bold text-gray-700">{booking.phone || booking.customer_phone || '-'}</span>
                  </div>
                </div>

                {cleanRemarks(booking.remarks, booking.details, booking.notes) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-dotted border-gray-200">
                    <p className="text-xs text-gray-500 italic">
                      &quot;{cleanRemarks(booking.remarks, booking.details, booking.notes)}&quot;
                    </p>
                  </div>
                )}

                {/* Delete Button */}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handlePermanentDelete(booking.id)}
                    disabled={deleting === booking.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === booking.id ? (
                      <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <FiTrash2 className="w-3 h-3" />
                    )}
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
