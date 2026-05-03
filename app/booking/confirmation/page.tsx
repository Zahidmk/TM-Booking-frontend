"use client";
import React, { useRef } from "react";
import { useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';
import { useBooking, BookingData } from "../../context/BookingContext";
import { formatDateDMY } from '@/lib/date';
import { FaHome, FaShareAlt } from 'react-icons/fa';
import html2canvas from "html2canvas";
// Helper to get array or fallback to single value
function getSlotArray<T = string>(slot: unknown, arrKey: string, singleKey: string): T[] {
  if (typeof slot === 'object' && slot !== null) {
    const s = slot as Record<string, unknown>;
    if (Array.isArray(s[arrKey])) return s[arrKey] as T[];
    if (s[singleKey] !== undefined) return [s[singleKey] as T];
  }
  return [];
}

type Personal = {
  customerName?: string;
  address?: string;
  phone1?: string;
};

export default function BookingConfirmationPage() {
  const { booking } = useBooking();
  const personal = (booking.personal || {}) as Personal;
  const slot = (booking.slot || {}) as BookingData['slot'];
  const payment = booking.payment || {};
  const detailsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Compute time slot label and total price for multi-slot
  const slotLabels = getSlotArray(slot, 'selectedSlotLabels', 'selectedSlotLabel');
  const slotPrices = getSlotArray<number>(slot, 'selectedSlotPrices', 'selectedSlotPrice');
  const timeSlotLabel = slotLabels.length ? slotLabels.join(', ') : '-';

  // Base sum of slot prices
  const baseTotal = slotPrices.length ? slotPrices.reduce((sum: number, p: number) => sum + (Number(p) || 0), 0) : 0;
  // Final total including night charges if selected
  const totalAmount = baseTotal + (slot.includeNight ? (slot.nightPrice || 0) : 0);



  const handleShareImage = async () => {
    if (!detailsRef.current) return;

    // Create a temporary div for sharing with better styling
    const tempDiv = document.createElement('div');
    tempDiv.className = 'html2canvas-reset bg-white rounded-xl shadow-lg p-8 w-96 flex flex-col items-center';
    tempDiv.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      z-index: -1;
      background: white !important;
      color: black !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    // Clone the content and replace Next.js Image with regular img
    const contentClone = detailsRef.current.cloneNode(true) as HTMLElement;
    const nextImage = contentClone.querySelector('img[src*="check.png"]');
    if (nextImage) {
      const regularImg = document.createElement('img');
      regularImg.src = '/check.png';
      regularImg.alt = 'Booking Confirmed';
      regularImg.style.cssText = 'width: 64px; height: 64px; margin-bottom: 1rem; display: block;';
      nextImage.parentNode?.replaceChild(regularImg, nextImage);
    }

    tempDiv.innerHTML = contentClone.innerHTML;
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        // (Removed duplicate declarations of slotLabels, slotPrices, timeSlotLabel, totalAmount)
        logging: false,
        width: 384, // w-96 = 24rem = 384px
        height: tempDiv.scrollHeight
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png", 0.95));
      if (!blob) return;

      const file = new File([blob], "booking-confirmation.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Booking Confirmation",
          text: "Your Booking confirmed.",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "booking-confirmation.png";
        a.click();
        URL.revokeObjectURL(url);
        alert("Sharing is not supported on this device. The image has been downloaded instead.");
      }
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-8">
      {/* Top actions: Logout to mirror other pages */}
      <div className="w-full max-w-md -mt-2 mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => { removeToken(); router.push('/auth/login'); }}
          className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          aria-label="Logout"
          title="Logout"
        >
          Logout
        </button>
      </div>
      <style>{`
        .html2canvas-reset, .html2canvas-reset * {
          color:rgb(0, 0, 0) !important;
          background: #ffffff !important;
          border-color: #e5e7eb !important;
          --tw-bg-opacity: 1 !important;
          --tw-text-opacity: 1 !important;
          --tw-border-opacity: 1 !important;
          --tw-prose-body: #222222 !important;
          --tw-prose-headings: #111111 !important;
          --tw-prose-links: #2563eb !important;
          --tw-prose-bold: #111111 !important;
          --tw-prose-counters: #555555 !important;
          --tw-prose-bullets: #555555 !important;
          --tw-prose-hr: #e5e7eb !important;
          --tw-prose-quotes: #111111 !important;
          --tw-prose-quote-borders: #e5e7eb !important;
          --tw-prose-captions: #888888 !important;
          --tw-prose-code: #111111 !important;
          --tw-prose-pre-bg: #f8fafc !important;
          --tw-prose-pre-border: #e5e7eb !important;
          --tw-prose-th-borders: #e5e7eb !important;
          --tw-prose-td-borders: #e5e7eb !important;
        }
      `}</style>
      <div ref={detailsRef} className="html2canvas-reset bg-white rounded-xl shadow-sm p-6 w-full max-w-md mb-6 flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>
        <h1 className="text-2xl mb-2 text-center text-black">Booking Confirmed!</h1>
        <h2 className="font-semibold text-lg mb-4 text-gray-800">Booking Details</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-gray-600">Customer Name</div>
          <div className="text-black font-medium">{personal.customerName || '-'}</div>
          <div className="text-gray-600">Address</div>
          <div className="text-black font-medium">{personal.address || '-'}</div>
          <div className="text-gray-600">Phone 1</div>
          <div className="text-black font-medium">{personal.phone1 || '-'}</div>


          <div className="text-gray-600">Date</div>
          <div className="text-black font-medium">{slot.date ? formatDateDMY(slot.date as string) : '-'}</div>
          <div className="text-gray-600">Time Slot</div>
          <div className="text-black font-medium">{timeSlotLabel}</div>
          <div className="text-gray-600">Total Amount</div>
          <div className="text-black font-medium">₹{totalAmount ? totalAmount.toLocaleString() : '-'}</div>
          <div className="text-gray-600">Received Amount</div>
          <div className="text-black font-medium">{payment.paymentType === 'advance' ? `₹${payment.advanceAmount || '-'}` : payment.paymentType === 'full' ? 'Full Payment' : '-'}</div>
          <div className="text-gray-600">Balance Amount</div>
          <div className="text-black font-medium">₹{typeof totalAmount === 'number' && payment.advanceAmount ? (totalAmount - (parseFloat(payment.advanceAmount) || 0)).toLocaleString() : '0'}</div>
        </div>
      </div>

      <button
        onClick={handleShareImage}
        className="w-full max-w-md bg-gray-50 text-blue-700 font-medium py-3 rounded-lg flex items-center justify-center gap-2 mb-3 border border-gray-200 hover:bg-gray-100 transition"
      >
        <FaShareAlt /> Share Details
      </button>
      <button
        onClick={() => router.push('/booking')}
        className="w-full max-w-md bg-[#204DC5] hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-base transition"
      >
        <span className="material-icons text-base"><FaHome /></span> New Booking
      </button>
    </div>
  );
} 