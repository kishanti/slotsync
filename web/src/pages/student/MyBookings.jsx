import React, { useState, useEffect } from 'react';
import api from '../../api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';

const STATUS_BADGE = {
  booked: 'primary',
  attended: 'success',
  no_show: 'warning',
  cancelled: 'secondary'
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function hoursUntil(iso) {
  return (new Date(iso) - new Date()) / (1000 * 60 * 60);
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  async function fetchBookings() {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data.data.bookings);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  async function handleCancel(bookingId) {
    setCancellingId(bookingId);
    try {
      await api.delete(`/bookings/${bookingId}`);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="container py-4">
      <h4 className="mb-4">My Bookings</h4>

      <Alert message={error} onClose={() => setError('')} />

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>📭</div>
          <p className="mt-2">No bookings yet. Go browse slots!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Slot</th>
                <th>Counsellor</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const canCancel = b.status === 'booked' && hoursUntil(b.slot?.startTime) >= 2;
                return (
                  <tr key={b._id}>
                    <td>{b.slot?.title}</td>
                    <td>{b.slot?.counsellor?.name || '—'}</td>
                    <td>{b.slot?.startTime ? formatDate(b.slot.startTime) : '—'}</td>
                    <td>{b.slot?.endTime ? formatDate(b.slot.endTime) : '—'}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGE[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      {canCancel && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleCancel(b._id)}
                          disabled={cancellingId === b._id}
                        >
                          {cancellingId === b._id
                            ? <span className="spinner-border spinner-border-sm" />
                            : 'Cancel'
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
