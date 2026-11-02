import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeStyle: 'short' });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

const OUTCOME_OPTIONS = ['attended', 'no_show'];

export default function CounsellorDashboard() {
  const { user } = useSelector((state) => state.auth);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // group slots by date for day view
  const groupedByDay = slots.reduce((acc, slot) => {
    const day = formatDate(slot.startTime);
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  useEffect(() => {
    fetchMySlots();
  }, []);

  async function fetchMySlots() {
    try {
      const res = await api.get('/slots');
      // filter to only this counsellor's own slots
      const mine = res.data.data.slots.filter((s) => {
        const counsellorId = s.counsellor?._id || s.counsellor;
        return String(counsellorId) === String(user.id);
      });
      setSlots(mine);
    } catch {
      setError('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }

  async function loadBookings(slot) {
    setSelectedSlot(slot);
    setBookingsLoading(true);
    try {
      // fetch all bookings for the slot through analytics is not ideal;
      // we use the student-facing slot data + a counsellor-specific view
      // For now, we call a route that returns bookings for a slot
      const res = await api.get(`/slots/${slot._id}/bookings`);
      setBookings(res.data.data.bookings);
    } catch {
      // If route not found, gracefully show empty
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function markOutcome(bookingId, status) {
    setUpdatingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/outcome`, { status });
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, status } : b)
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="container py-4">
      <h4 className="mb-4">My Schedule</h4>

      <Alert message={error} onClose={() => setError('')} />

      <div className="row g-4">
        {/* left: day view */}
        <div className="col-lg-5">
          {Object.keys(groupedByDay).length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem' }}>📆</div>
              <p className="mt-2">No slots assigned yet.</p>
            </div>
          ) : (
            Object.entries(groupedByDay).map(([day, daySlots]) => (
              <div key={day} className="mb-4">
                <h6 className="text-muted border-bottom pb-1">{day}</h6>
                {daySlots.map((slot) => (
                  <div
                    key={slot._id}
                    className={`card mb-2 slot-card ${selectedSlot?._id === slot._id ? 'border-primary' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => loadBookings(slot)}
                  >
                    <div className="card-body py-2 px-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{slot.title}</div>
                          <div className="text-muted small">
                            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                          </div>
                        </div>
                        <span className="badge bg-secondary">
                          {slot.confirmedCount}/{slot.capacity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* right: booking roster */}
        <div className="col-lg-7">
          {!selectedSlot ? (
            <div className="card p-4 text-center text-muted">
              Click a slot on the left to see its bookings
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <strong>{selectedSlot.title}</strong>
                <span className="text-muted ms-2 small">
                  {formatDate(selectedSlot.startTime)} · {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
                </span>
              </div>
              <div className="card-body p-0">
                {bookingsLoading ? (
                  <div className="p-4 text-center">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-muted p-4 mb-0">No bookings for this slot.</p>
                ) : (
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b._id}>
                          <td>{b.student?.name}</td>
                          <td>
                            <span className={`badge bg-${b.status === 'attended' ? 'success' : b.status === 'no_show' ? 'warning' : 'primary'}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            {b.status === 'booked' && (
                              <div className="d-flex gap-1">
                                {OUTCOME_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={updatingId === b._id}
                                    onClick={() => markOutcome(b._id, opt)}
                                  >
                                    {updatingId === b._id
                                      ? <span className="spinner-border spinner-border-sm" />
                                      : opt.replace('_', ' ')
                                    }
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
