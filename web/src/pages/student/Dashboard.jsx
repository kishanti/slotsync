import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import SlotCard from './SlotCard';

export default function StudentDashboard() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  async function fetchSlots(cursor = null, replace = true) {
    try {
      cursor ? setLoadingMore(true) : setLoading(true);

      const params = new URLSearchParams({ limit: 12 });
      if (cursor) params.append('cursor', cursor);
      if (fromDate) params.append('from', new Date(fromDate).toISOString());
      if (toDate) params.append('to', new Date(toDate).toISOString());

      const res = await api.get(`/slots?${params}`);
      const { slots: newSlots, nextCursor: nc } = res.data.data;

      setSlots((prev) => replace ? newSlots : [...prev, ...newSlots]);
      setNextCursor(nc);
    } catch {
      setError('Failed to load slots');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchSlots();
  }, []);

  function handleFilter(e) {
    e.preventDefault();
    fetchSlots(null, true);
  }

  function handleBookingChange() {
    // refresh after booking or joining waitlist
    fetchSlots(null, true);
  }

  if (loading) return <Spinner />;

  return (
    <div className="container py-4">
      <h4 className="mb-4">Available Slots</h4>

      {/* filters */}
      <div className="card mb-4 p-3">
        <form className="row g-2 align-items-end" onSubmit={handleFilter}>
          <div className="col-sm-4">
            <label className="form-label mb-1">From</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="col-sm-4">
            <label className="form-label mb-1">To</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="col-sm-4 d-flex gap-2">
            <button className="btn btn-primary btn-sm" type="submit">Filter</button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => { setFromDate(''); setToDate(''); fetchSlots(null, true); }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <Alert message={error} onClose={() => setError('')} />

      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>📅</div>
          <p className="mt-2">No slots found. Try adjusting the filters.</p>
        </div>
      ) : (
        <>
          <div className="row g-3">
            {slots.map((slot) => (
              <div className="col-md-6 col-lg-4" key={slot._id}>
                <SlotCard slot={slot} onChange={handleBookingChange} />
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="text-center mt-4">
              <button
                className="btn btn-outline-primary"
                onClick={() => fetchSlots(nextCursor, false)}
                disabled={loadingMore}
              >
                {loadingMore ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
