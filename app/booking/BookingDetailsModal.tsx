
import React from 'react';

export interface BookingDetails {
  id: string;
  date: string; // event date
  created_at?: string; // booked date (raw)
  createdAt?: string; // booked date (mapped)
  name?: string;
  customerName?: string;
  phone?: string;
  customerPhone?: string;
  customer_phone2?: string;
  phone2?: string;
  occasion_type?: string;
  occasion?: string;
  details?: string;
  notes?: string;
  remarks?: string;
  payment_mode?: string;
  paymentMode?: string;
  payment_type?: 'advance' | 'full';
  paymentType?: 'advance' | 'full';
  advance_amount?: string;
  advanceAmount?: string;
  total_amount?: string; // optional total stored in backend if added later
  price?: number; // possible price field from provider
  slot_id?: number;
  time?: string;
  groom_name?: string;
  bride_name?: string;
  address?: string;
  night?: string;
}

interface BookingDetailsModalProps {
  bookings: BookingDetails[];
  onClose: () => void;
  onEdit?: (booking: BookingDetails) => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ bookings, onClose, onEdit }) => {
  if (!bookings || bookings.length === 0) return null;

  const formatAmount = (val?: string | number) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return '-';
    if (n === 0) return '₹0';
    return `₹${n.toLocaleString()}`;
  };

  const formatDateDMY = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-[#F8FAFF]">
          <h3 className="text-lg font-semibold text-gray-900">
            Booking Details
            <span className="ml-2 text-gray-500 text-sm">{bookings[0].date}</span>
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          {bookings.map((details, idx) => {
            const name = details.name || details.customerName || '-';
            const phone = details.phone || details.customerPhone || '-';
            const occasion = details.occasion_type || details.occasion || '-';
            const payment = details.payment_mode || details.paymentMode || '-';
            const notes = details.remarks || details.details || details.notes || '-';
            const advance = details.advance_amount || details.advanceAmount || '';
            const paymentType = details.paymentType || (advance ? 'advance' : 'full');
            const totalRaw = details.total_amount || (details.price ? String(details.price) : '');
            const advanceNum = Number(advance);
            let totalNum = Number(totalRaw);
            // Fallback to default hall price if total is missing/invalid
            const DEFAULT_TOTAL = 40000; // change if your standard price differs
            if (!Number.isFinite(totalNum) || totalNum <= 0) {
              totalNum = DEFAULT_TOTAL;
            }
            let balanceDisplay = '-';
            if (paymentType === 'full') {
              balanceDisplay = '₹0';
            } else if (Number.isFinite(advanceNum) && advanceNum >= 0) {
              const bal = Math.max(0, totalNum - advanceNum);
              balanceDisplay = formatAmount(bal);
            }
            return (
              <div
                key={details.id || idx}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                        {details.time || 'Slot'}
                      </span>
                      <span className="text-xs text-gray-500">ID: {details.id}</span>
                    </div>
                    <div className="text-xs text-gray-500">Booked: {formatDateDMY(details.created_at || details.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col text-right">
                      <div className="text-[11px] text-gray-500">Total</div>
                      <div className="text-sm font-medium text-gray-800">{formatAmount(totalNum)}</div>
                    </div>
                    <div className="flex flex-col text-right mt-1">
                      <div className="text-[11px] text-gray-500">Advance</div>
                      <div className="text-base font-semibold text-gray-900">{formatAmount(advance)}</div>
                    </div>
                    <div className="flex flex-col text-right mt-1">
                      <div className="text-[11px] text-gray-500">Balance</div>
                      <div className="text-sm font-medium text-gray-800">{balanceDisplay}</div>
                    </div>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Customer</div>
                    <div className="text-gray-900 font-medium truncate">{name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Groom</div>
                        <div className="text-gray-900 font-medium truncate">{details.groom_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Bride</div>
                        <div className="text-gray-900 font-medium truncate">{details.bride_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Phone</div>
                    {phone !== '-' ? (
                      <a href={`tel:${phone}`} className="text-gray-900 font-medium underline decoration-dotted underline-offset-2">{phone}</a>
                    ) : (
                      <div className="text-gray-900 font-medium">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Phone 2</div>
                        <div className="text-gray-900 font-medium">{details.customer_phone2 || details.phone2 || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Groom</div>
                        <div className="text-gray-900 font-medium truncate">{details.groom_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Bride</div>
                        <div className="text-gray-900 font-medium truncate">{details.bride_name || '-'}</div>
                  <div className="sm:col-span-2">
                    <div className="text-gray-500 text-xs">Address</div>
                        <div className="text-gray-900 font-medium">{details.address || '-'}</div>
                  </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Occasion</div>
                    <div className="text-gray-900 font-medium truncate">{occasion}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Payment Mode</div>
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                      {payment}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-gray-500 text-xs">Address</div>
                    <div className="text-gray-900 font-medium">{details.address || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Booked Date</div>
                    <div className="text-gray-900 font-medium">{formatDateDMY(details.created_at || details.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Event Date</div>
                    <div className="text-gray-900 font-medium">{formatDateDMY(details.date)}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-gray-500 text-xs">Notes</div>
                    <div className="text-gray-900 font-medium whitespace-pre-wrap break-words">{notes}</div>
                  </div>
                </div>

                {/* Edit action (optional) */}
                {onEdit && (
                  <div className="flex justify-end mt-3">
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      onClick={() => onEdit(details)}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex justify-end">
          <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
