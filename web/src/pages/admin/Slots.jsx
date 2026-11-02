import React, { useState, useEffect } from 'react';
import api from '../../api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    counsellor: '',
    title: '',
    startTime: '',
    endTime: '',
    capacity: 5
  });
  const [saving, setSaving] = useState(false);

  const [editingSlot, setEditingSlot] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    try {
      const [slotsRes, counsellorsRes] = await Promise.all([
        api.get('/slots?limit=100'),
        api.get('/auth/counsellors')
      ]);
      setSlots(slotsRes.data.data.slots);
      setCounsellors(counsellorsRes.data.data.counsellors);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/slots', {
        ...form,
        capacity: parseInt(form.capacity),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString()
      });
      setSuccess('Slot created!');
      setShowForm(false);
      setForm({ counsellor: '', title: '', startTime: '', endTime: '', capacity: 5 });
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create slot');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(slot) {
    setEditingSlot(slot);
    setEditForm({
      title: slot.title,
      capacity: slot.capacity,
      version: slot.version
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setEditSaving(true);
    setError('');
    try {
      await api.patch(`/slots/${editingSlot._id}`, {
        ...editForm,
        capacity: parseInt(editForm.capacity),
        version: editingSlot.version
      });
      setSuccess('Slot updated!');
      setEditingSlot(null);
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Manage Slots</h4>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Slot'}
        </button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {/* create form */}
      {showForm && (
        <div className="card mb-4 p-3">
          <h6 className="mb-3">Create New Slot</h6>
          <form onSubmit={handleCreate}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Counsellor</label>
                <select
                  className="form-select"
                  name="counsellor"
                  value={form.counsellor}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select counsellor</option>
                  {counsellors.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  placeholder="Session title"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Start Time</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">End Time</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Capacity</label>
                <input
                  className="form-control"
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleFormChange}
                  min={1}
                  max={100}
                  required
                />
              </div>
            </div>

            <button className="btn btn-success mt-3" type="submit" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              {saving ? 'Creating...' : 'Create Slot'}
            </button>
          </form>
        </div>
      )}

      {/* edit modal */}
      {editingSlot && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Edit Slot</h6>
                <button className="btn-close" onClick={() => setEditingSlot(null)} />
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input
                      className="form-control"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Capacity</label>
                    <input
                      className="form-control"
                      type="number"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                      min={1}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingSlot(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editSaving}>
                    {editSaving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* slots table */}
      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>📭</div>
          <p className="mt-2">No slots yet. Create one above.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Counsellor</th>
                <th>Start</th>
                <th>End</th>
                <th>Capacity</th>
                <th>Booked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot._id}>
                  <td>{slot.title}</td>
                  <td>{slot.counsellor?.name}</td>
                  <td>{formatDate(slot.startTime)}</td>
                  <td>{formatDate(slot.endTime)}</td>
                  <td>{slot.capacity}</td>
                  <td>
                    <span className={`badge bg-${slot.confirmedCount >= slot.capacity ? 'danger' : 'success'}`}>
                      {slot.confirmedCount}/{slot.capacity}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => startEdit(slot)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
