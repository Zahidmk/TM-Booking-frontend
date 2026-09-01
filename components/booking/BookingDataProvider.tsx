"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from "react";
import * as api from '@/lib/api';
import { getToken } from '@/lib/auth';

// Types for the booking system
export interface Booking {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerPhone2: string;
  groomName?: string;
  brideName?: string;
  address: string;
  occasion: string;
  // utility type removed
  timeSlot: string;
  slotTime: string;
  price: number;
  notes: string;
  paymentType: 'advance' | 'full';
  advanceAmount?: string;
  paymentMode: 'bank' | 'cash' | 'upi';
  night?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  label: string;
  time: string;
  price: number;
}

export interface BookingFormData {
  // Slot Selection
    selectedTab: 'Dinner' | 'Day Time';
    selectedSlots: number[];
  occasion: string;
  // utility type removed
  notes: string;
  
  // Personal Details
  customerName: string;
  customerPhone: string;
  customerPhone2: string;
    groomName?: string;
    brideName?: string;
  address: string;
  
  // Payment Details
  paymentType: 'advance' | 'full';
  advanceAmount: string;
  paymentMode: 'bank' | 'cash' | 'upi';
}

// Mock data for testing - Only August 5th has bookings
// Removed mockBookings, now using backend API

export const timeSlots: TimeSlot[] = [
  { label: 'Lunch Time', time: '9:00 AM - 4:00 PM', price: 40000 },
  { label: 'Dinner Time', time: '6:00 PM - 10:00 PM', price: 40000 }
];

export const occasionTypes = [
  'Wedding Reception',
  'Wedding Ceremony',
  'Engagement Party',
  'Birthday Party',
  'Corporate Event',
  'Anniversary Celebration',
  'Other'
];

// Utility types removed

// Context type
export interface BookingDataContextType {
  currentBooking: BookingFormData | null;
  setCurrentBooking: Dispatch<SetStateAction<BookingFormData | null>>;
  bookings: Booking[];
  setBookings: Dispatch<SetStateAction<Booking[]>>;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  getBookingsByDate: (date: string) => Booking[];
  fetchBookings: () => Promise<void>; // Expose fetchBookings
  resetForm: () => void;
  populateFormFromBooking: (booking: Booking) => void;
};

const BookingDataContext = createContext<BookingDataContextType | null>(null);

export function BookingDataProvider({ children }: { children: ReactNode }) {
  const [currentBooking, setCurrentBooking] = useState<BookingFormData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch bookings from backend (use booking requests, not slots)
  const fetchBookings = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getRequests(token);
      // Use 'date' from backend as the booking date for frontend logic
      const normalized = Array.isArray(data)
        ? data.map((b) => ({
            ...b,
            date: b.date ? String(b.date).slice(0, 10) : '',
          }))
        : [];
      setBookings(normalized);
      console.log('[BookingDataProvider] Bookings fetched:', normalized);
    } catch (err) {
      console.error('[BookingDataProvider] Error fetching bookings:', err);
    }
  }, []);

  // Create a new booking slot (for staff)
  const createBooking = async (bookingData: Record<string, unknown>) => {
    const token = getToken();
    if (!token) return;
    await api.createSlot(bookingData, token);
    console.log('[BookingDataProvider] Booking created:', bookingData);
    await fetchBookings();
  };

  // Update booking (implement if needed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateBooking = async (_id: string, _updates: Partial<Booking>) => {
    // Not implemented: add API call if backend supports
    return Promise.resolve();
  };

  // Delete a booking (implement if needed)
  const deleteBooking = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await api.deleteBooking(id, token);
    console.log('[BookingDataProvider] Booking deleted:', id);
    await fetchBookings();
  };

  // Get bookings for a specific date
  const getBookingsByDate = (date: string) => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter(booking => booking.date === date);
  };

  // Reset form data
  const resetForm = () => {
    setCurrentBooking(null);
  };

  // Fetch bookings on mount; if token isn't ready yet (immediately after login),
  // retry a few times until it is available to avoid the need for manual refreshes.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (token) {
      fetchBookings();
    } else {
      // Retry up to 5 times within ~5 seconds
      let attempts = 0;
      const interval = setInterval(() => {
        if (cancelled) return clearInterval(interval);
        const t = getToken();
        attempts += 1;
        if (t) {
          clearInterval(interval);
          fetchBookings();
        } else if (attempts >= 5) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    return () => { cancelled = true; };
  }, [fetchBookings]);

  // Refresh when window/tab gains focus (keeps dashboard and calendar fresh)
  useEffect(() => {
    const onFocus = () => {
      const token = getToken();
      if (token) fetchBookings();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchBookings]);

  // Populate form from existing booking
  const populateFormFromBooking = (booking: Booking) => {
    // Support multi-slot: booking.slotTime can be a comma-separated string of slot times
    const slotTimes = booking.slotTime ? booking.slotTime.split(',').map(s => s.trim()) : [];
    setCurrentBooking({
      selectedTab: 'Dinner', // or 'Day Time' if you want to infer from booking
      selectedSlots: slotTimes.length > 0 ? slotTimes.map(label => timeSlots.findIndex(ts => ts.time === label)).filter(idx => idx !== -1) : [],
      occasion: booking.occasion,
  // utility removed
      notes: booking.notes,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerPhone2: booking.customerPhone2,
      groomName: booking.groomName || '',
      brideName: booking.brideName || '',
      address: booking.address,
      paymentType: booking.paymentType,
      advanceAmount: booking.advanceAmount || '',
      paymentMode: booking.paymentMode
    });
  };

  return (
    <BookingDataContext.Provider value={{
      currentBooking,
      setCurrentBooking,
      bookings,
      setBookings,
      createBooking,
      updateBooking: updateBooking ?? (() => {}),
      deleteBooking,
      getBookingsByDate,
      fetchBookings, // Expose fetchBookings
      resetForm,
      populateFormFromBooking
    }}>
      {children}
    </BookingDataContext.Provider>
  );
}

export function useBookingData() {
  const context = useContext(BookingDataContext);
  if (!context) {
    throw new Error('useBookingData must be used within a BookingDataProvider');
  }
  return context;
}