"use client";
import React, { useState, useEffect, useRef } from "react";
import { getToken } from "@/lib/auth";
import { formatDateDMY } from "@/lib/date";
import { FiPrinter, FiDownload, FiFilter, FiCalendar, FiTrendingUp, FiPieChart, FiBarChart2, FiTrash2 } from "react-icons/fi";
import { deleteBooking } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Strip backend-prepended "Booked on DD/MM/YYYY" prefix from remarks
// Strip backend-prepended "Booked on DD/MM/YYYY" prefix from remarks
// Accepts primary + optional fallback fields (deleted bookings/bookings may use 'details' or 'notes' instead of 'remarks')
const cleanRemarks = (remarks?: string, details?: string, notes?: string): string => {
  const raw = remarks || details || notes || '';
  if (!raw) return '';
  return raw.replace(/^Booked on[^\n]*\n?/i, '').trim();
};

interface Booking {
  id: number;
  date: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  customer_phone?: string;
  total_amount?: string | number;
  night?: string;
  advance_amount?: string | number;
  balance_amount?: number;
  utensil?: string;
  final_payment?: string | number;
  remarks?: string;
  details?: string;
  notes?: string;
  time?: string;
  created_at?: string;
}

interface ChartData {
  monthly: Array<{ month: string; count: number; revenue: number }>;
  slots: Array<{ slot_name: string; count: number }>;
  night: Array<{ night: string; count: number }>;
}

interface ReportsSummary {
  total_bookings: number;
  total_revenue: number;
  total_advance: number;
  avg_booking_value: number;
  total_balance?: number;
}

interface ReportsData {
  bookings: Booking[];
  charts: ChartData;
  summary: ReportsSummary;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReports = async () => {
    setLoading(true);
    const token = getToken();
    if (!token || !API_URL) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      if (bookingDate) params.append("bookingDate", bookingDate);

      const res = await fetch(`${API_URL}/bookings/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    fetchReports();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setBookingDate("");
    fetchReports();
    setShowFilters(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Report - TM Mahal</title>
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
            .summary { 
              display: flex; 
              justify-content: space-around; 
              margin-bottom: 20px;
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
            }
            .summary-item { text-align: center; }
            .summary-item .value { 
              font-size: 18px; 
              font-weight: bold; 
              color: #1e40af;
            }
            .summary-item .label { 
              font-size: 10px; 
              color: #666; 
              text-transform: uppercase;
            }
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
            <p>Event Booking Report</p>
            <p style="margin-top: 5px;">
              ${fromDate || toDate ? `Date Range: ${fromDate ? formatDateDMY(fromDate) : 'All'} - ${toDate ? formatDateDMY(toDate) : 'Present'}` : 'All Bookings'}
            </p>
            <p style="margin-top: 3px; color: #888;">Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          ${data ? `
            <div class="summary">
              <div class="summary-item">
                <div class="value">${data.summary.total_bookings}</div>
                <div class="label">Total Bookings</div>
              </div>
              <div class="summary-item">
                <div class="value">₹${(Number(data.summary.total_revenue) || 0).toLocaleString()}</div>
                <div class="label">Total Revenue</div>
              </div>
              <div class="summary-item">
                <div class="value">₹${(Number(data.summary.total_advance) || 0).toLocaleString()}</div>
                <div class="label">Total Advance</div>
              </div>
              <div class="summary-item">
                <div class="value">₹${((Number(data.summary.total_revenue) || 0) - (Number(data.summary.total_advance) || 0)).toLocaleString()}</div>
                <div class="label">Total Balance</div>
              </div>
            </div>
          ` : ''}
          
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
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${data?.bookings.map(b => `
                <tr>
                  <td>${b.date ? formatDateDMY(b.date) : '-'}</td>
                  <td>${b.customer_name || b.name || '-'}</td>
                  <td>${b.phone || b.customer_phone || '-'}</td>
                  <td class="text-right">₹${(parseFloat(String(b.total_amount)) || 0).toLocaleString()}</td>
                  <td class="text-center">${b.night || 'No'}</td>
                  <td class="text-right">₹${(parseFloat(String(b.advance_amount)) || 0).toLocaleString()}</td>
                  <td class="text-right">₹${(b.balance_amount || 0).toLocaleString()}</td>
                  <td>${cleanRemarks(b.remarks, b.details, b.notes) || '-'}</td>
                </tr>
              `).join('') || '<tr><td colspan="8" class="text-center">No bookings found</td></tr>'}
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
    if (!data?.bookings.length) return;

    const headers = [
      "Event Date",
      "Customer Name",
      "Phone",
      "Total Amount",
      "Night",
      "Advance Amount",
      "Balance Amount",
      "Remarks"
    ];

    const rows = data.bookings.map(b => [
      b.date ? formatDateDMY(b.date) : "",
      b.customer_name || b.name || "",
      b.phone || b.customer_phone || "",
      parseFloat(String(b.total_amount)) || 0,
      b.night || "No",
      parseFloat(String(b.advance_amount)) || 0,
      b.balance_amount || 0,
      cleanRemarks(b.remarks, b.details, b.notes) || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Simple bar chart component
  const BarChart = ({ data: chartData, label, valueKey, nameKey }: {
    data: Array<Record<string, string | number>>;
    label: string;
    valueKey: string;
    nameKey: string;
  }) => {
    const maxValue = Math.max(...chartData.map(d => Number(d[valueKey]) || 0), 1);

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col h-full">
        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FiBarChart2 className="w-5 h-5" />
          </div>
          {label}
        </h4>
        <div className="flex-1 space-y-3">
          {chartData.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-1">
                <span className="truncate">{String(item[nameKey])}</span>
                <span className="text-gray-900">{Number(item[valueKey])}</span>
              </div>
              <div className="group relative">
                <div className="w-full bg-gray-100 rounded-xl h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-xl transition-all duration-1000 ease-out shadow-sm flex items-center justify-end pr-2"
                    style={{ width: `${(Number(item[valueKey]) / maxValue) * 100}%` }}
                  >
                    {Number(item[valueKey]) > 0 && (maxValue > 0 && (Number(item[valueKey]) / maxValue) > 0.1) && (
                      <span className="text-[10px] text-white font-bold animate-in fade-in zoom-in duration-1000">
                        {Number(item[valueKey])}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple pie chart display
  const PieChartDisplay = ({ data: chartData, label, nameKey, valueKey }: {
    data: Array<Record<string, string | number>>;
    label: string;
    nameKey: string;
    valueKey: string;
  }) => {
    const total = chartData.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col h-full">
        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <div className="p-2 bg-green-50 rounded-lg text-green-600">
            <FiPieChart className="w-5 h-5" />
          </div>
          {label}
        </h4>
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {chartData.reduce((acc: React.ReactElement[], item, index) => {
                const value = Number(item[valueKey]) || 0;
                const percentage = total > 0 ? (value / total) * 100 : 0;
                const previousPercentage = chartData
                  .slice(0, index)
                  .reduce((sum, d) => sum + (Number(d[valueKey]) / total) * 100, 0);

                const circumference = 2 * Math.PI * 35; // reduced radius slightly
                const dashArray = (percentage / 100) * circumference;
                const dashOffset = (previousPercentage / 100) * circumference;

                acc.push(
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke={colors[index % colors.length]}
                    strokeWidth="15"
                    strokeDasharray={`${dashArray} ${circumference}`}
                    strokeDashoffset={-dashOffset}
                    className="transition-all duration-700 ease-in-out"
                  />
                );
                return acc;
              }, [])}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{total}</span>
              <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-y-2 gap-x-4 w-full sm:w-auto">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">{String(item[nameKey])}</span>
                  <span className="text-sm font-semibold text-gray-800">{Number(item[valueKey])}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">View and analyze booking data with interactive charts and advanced filters</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm border ${showFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <FiFilter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all shadow-md shadow-blue-200 shadow-sm"
          >
            <FiPrinter className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition-all shadow-md shadow-emerald-200 shadow-sm"
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-in slide-in-from-top-2">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiCalendar className="text-blue-600" />
            Date Filters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-100 ring-1 ring-blue-500/10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Total</span>
            </div>
            <div className="text-gray-100 text-sm font-medium mb-1">Total Bookings</div>
            <div className="text-3xl font-bold">{data.summary.total_bookings}</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100 ring-1 ring-emerald-500/10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiTrendingUp className="w-5 h-5 rotate-45" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Revenue</span>
            </div>
            <div className="text-gray-100 text-sm font-medium mb-1">Total Revenue</div>
            <div className="text-3xl font-bold">₹{(Number(data.summary.total_revenue) || 0).toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-100 ring-1 ring-amber-500/10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiCalendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Paid</span>
            </div>
            <div className="text-gray-100 text-sm font-medium mb-1">Total Advance</div>
            <div className="text-3xl font-bold">₹{(Number(data.summary.total_advance) || 0).toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-100 ring-1 ring-purple-500/10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiPieChart className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Due</span>
            </div>
            <div className="text-gray-100 text-sm font-medium mb-1">Total Balance</div>
            <div className="text-3xl font-bold">₹{((Number(data.summary.total_revenue) || 0) - (Number(data.summary.total_advance) || 0)).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.charts.monthly.length > 0 && (
            <BarChart
              data={data.charts.monthly}
              label="Monthly Bookings"
              valueKey="count"
              nameKey="month"
            />
          )}
          {data.charts.slots.length > 0 && (
            <PieChartDisplay
              data={data.charts.slots}
              label="Bookings by Slot"
              valueKey="count"
              nameKey="slot_name"
            />
          )}
          {data.charts.night.length > 0 && (
            <PieChartDisplay
              data={data.charts.night}
              label="Night Option Usage"
              valueKey="count"
              nameKey="night"
            />
          )}
        </div>
      )}

      {/* Data Table / Mobile Cards */}
      <div ref={printRef} className="space-y-4">
        <div className="bg-transparent md:bg-white rounded-2xl overflow-hidden">
          <div className="md:p-6 p-2 border-b border-gray-100 bg-gray-50/30">
            <h3 className="font-bold text-gray-800">Booking Details</h3>
            <p className="text-sm text-gray-500">Complete transaction history ordered by Event Date</p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar w-full">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[800px]">
              <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Event Date</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Customer</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Phone</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Total Amt</th>
                  <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Night</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Advance</th>
                  <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-gray-100 bg-gray-50">Balance</th>
                  <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase tracking-wider text-[10px] border-b border-gray-100 bg-gray-50">Remarks</th>
                  <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase tracking-wider text-[10px] border-b border-gray-100 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.bookings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FiCalendar className="w-10 h-10 opacity-20" />
                        <p>No bookings found for the selected period.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {data?.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors group">
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
                    <td className="py-4 px-6 text-gray-500 max-w-[150px] truncate italic" title={cleanRemarks(booking.remarks, booking.details, booking.notes)}>
                      {cleanRemarks(booking.remarks, booking.details, booking.notes) || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center">
                        <button
                          className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-200"
                          title="Delete Booking"
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to delete this booking?')) return;
                            const token = getToken();
                            if (!token) return;
                            try {
                              await deleteBooking(String(booking.id), token);
                              fetchReports();
                            } catch {
                              alert('Failed to delete booking.');
                            }
                          }}
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

          {/* Mobile Card View */}
          <div className="lg:hidden flex flex-col gap-2">
            {data?.bookings.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <FiCalendar className="w-10 h-10 mx-auto opacity-20 mb-3" />
                <p>No bookings found.</p>
              </div>
            )}
            {data?.bookings.map((booking) => (
              <div key={booking.id} className="p-4 bg-white hover:bg-gray-50/50 transition-colors rounded-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">
                      {booking.customer_name || booking.name || 'Unknown Guest'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {booking.date ? formatDateDMY(booking.date) : '-'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${booking.night === 'Yes'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {booking.night || 'No'} Night
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 p-3 rounded-xl">
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

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="font-semibold">Phone:</span> {booking.phone || booking.customer_phone || '-'}
                    </p>
                    {cleanRemarks(booking.remarks, booking.details, booking.notes) && (
                      <p className="text-xs text-gray-500 italic truncate italic">
                        &quot;{cleanRemarks(booking.remarks, booking.details, booking.notes)}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    className="flex-shrink-0 p-2 text-red-500 bg-red-50 rounded-lg"
                    onClick={() => {
                      if (!window.confirm('Delete this booking?')) return;
                      deleteBooking(String(booking.id), getToken()!).then(() => fetchReports());
                    }}
                  >
                    <FiTrash2 className="w-4 h-4" />
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
