"use client";
import { useState, useEffect } from 'react';
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from 'next/navigation';
import { useBooking } from '../../context/BookingContext';
import { useBookingData, Booking } from '../../../components/booking/BookingDataProvider';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import BookingCards from '../../../components/BookingCards';
import BookingForm from '../../../components/BookingForm';

const fullDaySlots = [
  { label: 'Full Day', time: '9:00 AM - 11:00 PM', price: 100000 },
];

// Only August 5th has booked dates - using centralized data provider
// Note: This is now handled by the centralized data provider

// Helper function to format date consistently
const formatDateForComparison = (date: Date) => {
  // Use local date string to avoid timezone issues
  // This ensures the date is always in local time, not UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SlotSelectionPage() {
  const { booking, setBooking } = useBooking();
  const { getBookingsByDate, deleteBooking } = useBookingData();
  // Only one slot: Full Day
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize date after component mounts to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    if (booking?.slot?.date) {
      setDate(new Date(booking.slot.date));
    }
  }, [booking?.slot?.date]);
  const [occasion, setOccasion] = useState(booking?.slot?.occasion ?? '');
  // utility removed
  const [notes, setNotes] = useState(booking?.slot?.notes ?? '');
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const router = useRouter();

  const timeSlots = fullDaySlots;
  const today = new Date();

  // Get all bookings for a date
  const getDateBookings = (date: Date) => {
    const dateString = formatDateForComparison(date);
    return getBookingsByDate(dateString);
  };

  // Check if a slot is booked for a date
  // Removed unused isSlotBooked function

  // Check if the full day is booked for a date
  const isDateFullyBooked = (date: Date) => {
    const bookings = getDateBookings(date);
    return bookings.some(b => b.timeSlot === 'Full Day' || b.slotTime === 'Full Day');
  };

  // Function to check if a date is available (not booked and not in the past)
  const isDateAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today && !isDateFullyBooked(date);
  };

  // Custom tile content for calendar
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (isDateFullyBooked(date)) {
        return (
          <div className="w-full h-full flex items-center justify-center"></div>
        );
      } else if (isDateAvailable(date)) {
        return (
          <div className="w-full h-full flex items-center justify-center"></div>
        );
      }
    }
    return null;
  };

  // Custom tile className for calendar (red for fully booked, yellow for partially booked)
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (isDateFullyBooked(date)) {
        return 'booked-date bg-red-200 text-red-800 font-bold rounded-full';
      } else if (isDateAvailable(date)) {
        return 'available-date';
      }
    }
    return '';
  };

  // Modal state for booking details
  const [showBookingModal, setShowBookingModal] = useState(false);
  // Disable only past dates, allow booked dates to be selectable
  const tileDisabled = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only disable past dates, allow booked dates to be selectable
      return date < today;
    }
    return false;
  };

  // Handle calendar date change
  const handleDateChange = (value: unknown) => {
    if (value instanceof Date) {
      setDate(value);
      const dateString = formatDateForComparison(value);
      const dateBookings = getBookingsByDate(dateString);
      if (dateBookings && dateBookings.length > 0) {
        setSelectedDateBookings(dateBookings);
        setIsEditMode(false);
        setEditingBooking(null);
        setShowBookingModal(true);
      } else {
        setSelectedDateBookings([]);
        setIsEditMode(false);
        setEditingBooking(null);
        setShowBookingModal(false);
      }
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    if (selectedSlots.length === 0) {
      alert('Please select at least one slot.');
      return;
    }
    // Prevent double booking: if any selected slot is already booked, do not allow booking
    const bookedTimes = selectedDateBookings.map(b => b.slotTime);
    const conflict = selectedSlots.some(idx => bookedTimes.includes(timeSlots[idx].time));
    if (conflict && !isEditMode) {
      alert('One or more selected slots are already booked. Please select available slots.');
      return;
    }
    // If in edit mode, update booking
    if (isEditMode && editingBooking) {
      const updatedBooking = {
        ...editingBooking,
        occasion,
        notes,
        timeSlots: selectedSlots.map(idx => timeSlots[idx].label),
        slotTimes: selectedSlots.map(idx => timeSlots[idx].time),
        price: selectedSlots.reduce((sum, idx) => sum + timeSlots[idx].price, 0)
      };
      const updatedBookings = selectedDateBookings.map(booking => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      );
      setSelectedDateBookings(updatedBookings);
      setBooking(prev => ({
        ...prev,
        slot: {
          selectedSlots,
          selectedSlotLabels: selectedSlots.map(idx => timeSlots[idx].label),
          selectedSlotTimes: selectedSlots.map(idx => timeSlots[idx].time),
          selectedSlotPrices: selectedSlots.map(idx => timeSlots[idx].price),
          date: formatDateForComparison(date),
          occasion,
          // utility removed
          notes,
        },
        personal: {
          customerName: editingBooking.customerName,
          phone1: editingBooking.customerPhone,
          phone2: editingBooking.customerPhone2,
          groomName: editingBooking.groomName,
          brideName: editingBooking.brideName,
          address: editingBooking.address,
        },
        payment: {
          paymentType: editingBooking.paymentType,
          advanceAmount: editingBooking.advanceAmount || '',
          paymentMode: editingBooking.paymentMode,
        }
      }));
      setIsEditMode(false);
      setEditingBooking(null);
    } else {
      // For new bookings, set all selected slots
      setBooking(prev => ({
        ...prev,
        slot: {
          selectedSlots,
          selectedSlotLabels: selectedSlots.map(idx => timeSlots[idx].label),
          selectedSlotTimes: selectedSlots.map(idx => timeSlots[idx].time),
          selectedSlotPrices: selectedSlots.map(idx => timeSlots[idx].price),
          date: formatDateForComparison(date),
          occasion,
          // utility removed
          notes,
        },
      }));
    }
    router.push('/booking/personal-payment');
  };

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <main className="w-full max-w-2xl p-0 sm:p-4">
          <div className="max-w-md mx-auto px-4 py-6 bg-white">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <main className="w-full max-w-2xl p-0 sm:p-4">
        <div className="max-w-md mx-auto px-4 py-6 bg-white">
          <div className="flex items-center mb-4 border-b border-[#F3F4F6] pb-4  -mx-4 px-4">
            <button className="mr-2 text-xl text-black" onClick={() => router.back()}><IoIosArrowBack /></button>
            <h2 className="flex-1 text-center font-semibold text-lg text-black">Book Your Slot</h2>
          </div>
          <form className="flex flex-col gap-3" onSubmit={handleNext}>
            {/* Slot Selection Section */}  
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-base mb-3 text-black border-b border-gray-200 pb-2">Slot Selection</h3>
              
              {/* Calendar Section */}
              <div className="mb-4">
                <div className="calendar-container">
                    <Calendar
                      onChange={handleDateChange}
                      value={date}
                      tileContent={tileContent}
                      tileClassName={tileClassName}
                      tileDisabled={tileDisabled}
                      minDate={today}
                      showNeighboringMonth={false}
                      className="w-full border rounded-lg"
                    />
                </div>
                {/* Enhanced Legend */}
                <div className="calendar-legend">
                  <div className="calendar-legend-item">
                    <div className="calendar-legend-dot available"></div>
                    <span>Available</span>
                  </div>
                  <div className="calendar-legend-item">
                    <div className="calendar-legend-dot booked"></div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>

              {/* Booking Form - Only one slot: Full Day */}
              {(!date || selectedDateBookings.length === 0 || isEditMode) && (
                <BookingForm
                  selectedSlots={selectedSlots}
                  setSelectedSlots={setSelectedSlots}
                  occasion={occasion}
                  setOccasion={setOccasion}
                    // utility prop removed
                  // setUtility prop removed
                  notes={notes}
                  setNotes={setNotes}
                  timeSlots={timeSlots.map((slot) => ({
                    ...slot,
                    disabled: date ? isDateFullyBooked(date) : false
                  }))}
                  date={date}
                  isEditMode={isEditMode}
                  editingBooking={editingBooking}
                  bookedTimes={selectedDateBookings.map(b => b.slotTime)}
                />
              )}

              {/* Booked Customer Details Section - Show when there are bookings and NOT in edit mode */}
              {selectedDateBookings.length > 0 && !isEditMode && (
                <BookingCards 
                  date={date}
                  bookings={selectedDateBookings}
                  onEditBooking={(booking) => {
                    setEditingBooking(booking as Booking);
                    setIsEditMode(true);
                  }}
                />
              )}
            </section>
          </form>

          {/* Booked Customer Details Modal - Show when there are bookings and NOT in edit mode */}
          {showBookingModal && selectedDateBookings.length > 0 && !isEditMode && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setShowBookingModal(false)}></div>
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full z-50 relative">
                <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#F8FAFF] text-gray-400 text-left">
                        <th className="py-3 px-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">Phone</th>
                        <th className="py-3 px-4 font-medium">Occasion</th>
                        <th className="py-3 px-4 font-medium">Utility</th>
                        <th className="py-3 px-4 font-medium">Notes</th>
                        <th className="py-3 px-4 font-medium">Payment Mode</th>
                        <th className="py-3 px-4 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium">Time</th>
                        <th className="py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {selectedDateBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.customerName}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.customerPhone}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.occasion}</td>
                          {/* utility column removed */}
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.notes}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.paymentMode}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.date}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB]">{booking.slotTime}</td>
                          <td className="py-3 px-4 border-b border-[#E5E7EB] flex gap-2">
                            <button
                              className="text-blue-500 hover:text-blue-700 font-bold text-sm border border-blue-100 rounded px-2 py-1"
                              onClick={() => {
                                setEditingBooking(booking as Booking);
                                setIsEditMode(true);
                                setShowBookingModal(false);
                              }}
                            >Edit</button>
                            <button
                              className="text-red-500 hover:text-red-700 font-bold text-sm border border-red-100 rounded px-2 py-1"
                              onClick={async () => {
                                await deleteBooking(booking.id);
                                setShowBookingModal(false);
                              }}
                            >Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="mt-2 px-4 py-2 bg-gray-200 rounded" onClick={() => setShowBookingModal(false)}>Close</button>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}