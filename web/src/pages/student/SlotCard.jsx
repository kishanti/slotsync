import React, { useState } from 'react';
import api from '../../api';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export default function SlotCard({ slot, onChange }) {
  const [booking, setBooking] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');

  const seatsLeft = slot.capacity - slot.confirmedCount;
  const isFull = seatsLeft <= 0;

  async function handleBook() {
    setBooking(true);
    setMsg('');
    try {
      await api.post('/bookings', { slotId: slot._id });
      setMsg('Booked successfully!');
      setMsgType('success');
      onChange(); // refresh seat count on success
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Booking failed';

      if (code === 'SLOT_FULL') {
        setMsg('Slot just filled up. You can join the waitlist.');
        setMsgType('warning');
        onChange(); // refresh so the card flips to "Full" state
      } else if (code === 'OVERLAPPING_BOOKING') {
        setMsg('You already have a booking that overlaps with this time.');
        setMsgType('danger');
        // no onChange — card state doesn't need to change
      } else {
        // covers 422 (booking window), 400, etc.
        setMsg(message);
        setMsgType('danger');
        // no onChange — card state doesn't need to change
      }
    } finally {
      setBooking(false);
    }
  }

  async function handleWaitlist() {
    setWaiting(true);
    setMsg('');
    try {
      await api.post('/waitlist', { slotId: slot._id });
      setMsg('Added to waitlist!');
      setMsgType('success');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to join waitlist');
      setMsgType('danger');
    } finally {
      setWaiting(false);
    }
  }

  return (
    <div className="card h-100 slot-card">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="card-title mb-0">{slot.title}</h6>
          {isFull ? (
            <span className="badge bg-danger seat-badge">Full</span>
          ) : (
            <span className="badge bg-success seat-badge">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
          )}
        </div>

        <p className="text-muted small mb-1">
          🗓 {formatDate(slot.startTime)} → {formatDate(slot.endTime)}
        </p>
        <p className="text-muted small mb-3">
          👤 {slot.counsellor?.name}
        </p>

        {msg && (
          <div className={`alert alert-${msgType} py-2 px-2 small mb-2 d-flex justify-content-between align-items-center`}>
            <span>{msg}</span>
            <button
              type="button"
              className="btn-close btn-close-sm ms-2"
              style={{ fontSize: '0.6rem' }}
              onClick={() => setMsg('')}
            />
          </div>
        )}

        <div className="mt-auto d-flex gap-2">
          {!isFull ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleBook}
              disabled={booking}
            >
              {booking ? <span className="spinner-border spinner-border-sm me-1" /> : null}
              {booking ? 'Booking...' : 'Book'}
            </button>
          ) : (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleWaitlist}
              disabled={waiting}
            >
              {waiting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
              {waiting ? 'Joining...' : 'Join Waitlist'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
