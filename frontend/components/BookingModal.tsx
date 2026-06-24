import React, { useState } from 'react';
import { bookFlight, bookHotel } from '../lib/api';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'FLIGHT' | 'HOTEL';
  itemDetails: any;
  tripId: number;
  itineraryItemId?: number;
  onSuccess: (bookingData: any) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  type,
  itemDetails,
  tripId,
  itineraryItemId,
  onSuccess
}: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Passenger / Guest Details State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    passportNumber: '', // Only for FLIGHT
    specialRequests: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (type === 'FLIGHT') {
        result = await bookFlight(tripId, itemDetails, formData, itineraryItemId);
      } else {
        result = await bookHotel(tripId, itemDetails, formData, itineraryItemId);
      }
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {type === 'FLIGHT' ? 'Book Flight' : 'Book Hotel'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {/* Item Summary */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            {type === 'FLIGHT' ? (
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-1">
                  {itemDetails.airline} - {itemDetails.flight_number}
                </h3>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {itemDetails.departure_airport} ({itemDetails.departure_time}) 
                  <span className="mx-2">→</span> 
                  {itemDetails.arrival_airport} ({itemDetails.arrival_time})
                </p>
                <div className="mt-3 flex justify-between items-end">
                  <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                    {itemDetails.cabin_class || 'ECONOMY'}
                  </span>
                  <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                    {formatPrice(itemDetails.price, itemDetails.currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-1">
                  {itemDetails.name}
                </h3>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {itemDetails.address}
                </p>
                <div className="mt-3 flex justify-between items-end">
                  <span className="flex items-center text-yellow-500">
                    {'★'.repeat(itemDetails.stars || 4)}
                    <span className="ml-1 text-xs text-blue-800 dark:text-blue-200 font-medium">({itemDetails.rating})</span>
                  </span>
                  <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                    {formatPrice(itemDetails.total_price || itemDetails.price_per_night, itemDetails.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form id="booking-form" onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name (as in passport/ID)
              </label>
              <input 
                type="text" 
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="JOHN DOE"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="+84 123 456 789"
                />
              </div>
            </div>

            {type === 'FLIGHT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport / ID Number
                </label>
                <input 
                  type="text" 
                  name="passportNumber"
                  required
                  value={formData.passportNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="A1234567"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Special Requests (Optional)
              </label>
              <textarea 
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Dietary requirements, accessibility needs..."
              />
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Payment:</span> For this sandbox demonstration, no real payment will be processed. A simulated PNR will be generated via Travelport GDS.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="booking-form"
            disabled={loading}
            className="px-6 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
