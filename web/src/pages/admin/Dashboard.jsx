import React, { useState, useEffect } from 'react';
import api from '../../api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';

export default function AdminDashboard() {
  const [counsellors, setCounsellors] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCounsellors();
  }, []);

  async function fetchCounsellors() {
    try {
      const res = await api.get('/auth/counsellors');
      const list = res.data.data.counsellors;
      setCounsellors(list);
      if (list.length > 0) {
        setSelectedId(list[0]._id);
        loadAnalytics(list[0]._id);
      }
    } catch {
      setError('Failed to load counsellors');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(id) {
    setAnalyticsLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/counsellor/${id}`);
      setAnalytics(res.data.data.analytics);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function handleSelect(e) {
    const id = e.target.value;
    setSelectedId(id);
    loadAnalytics(id);
  }

  async function handleCreateCounsellor(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/auth/counsellor', form);
      setSuccess(`Counsellor "${form.name}" created. They can now log in.`);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      fetchCounsellors(); // refresh dropdown so new counsellor appears
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create counsellor');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Analytics Dashboard</h4>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Counsellor'}
        </button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {showForm && (
        <div className="card mb-4 p-3">
          <h6 className="mb-3">Create Counsellor Account</h6>
          <form onSubmit={handleCreateCounsellor}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Full name"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="counsellor@example.com"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <button className="btn btn-success mt-3" type="submit" disabled={creating}>
              {creating && <span className="spinner-border spinner-border-sm me-2" />}
              {creating ? 'Creating...' : 'Create Counsellor'}
            </button>
          </form>
        </div>
      )}

      {counsellors.length > 0 ? (
        <>
          <div className="mb-4" style={{ maxWidth: 320 }}>
            <label className="form-label">Select Counsellor</label>
            <select className="form-select" value={selectedId} onChange={handleSelect}>
              {counsellors.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          {analyticsLoading ? <Spinner /> : analytics ? <Analytics data={analytics} /> : null}
        </>
      ) : (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>👤</div>
          <p className="mt-2">No counsellors yet. Create one above, then assign slots to them.</p>
        </div>
      )}
    </div>
  );
}

function Analytics({ data }) {
  const maxBucket = Math.max(...Object.values(data.leadTimeBuckets || {}), 1);

  return (
    <>
      <div className="row g-3 mb-4">
        <StatCard label="Total Slots" value={data.totalSlots} color="primary" />
        <StatCard label="Confirmed Bookings" value={data.totalConfirmedBookings} color="success" />
        <StatCard label="Utilization" value={`${data.utilization}%`} color="info" />
        <StatCard label="No-show Rate" value={`${data.noShowPercentage}%`} color="warning" />
        <StatCard label="Cancellation Rate" value={`${data.cancellationPercentage}%`} color="danger" />
        <StatCard label="Avg Lead Time" value={`${data.averageLeadTimeMinutes} min`} color="secondary" />
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card p-3">
            <h6 className="mb-3">Lead Time Distribution</h6>
            {Object.entries(data.leadTimeBuckets || {}).map(([label, count]) => (
              <div key={label} className="mb-2">
                <div className="d-flex justify-content-between small mb-1">
                  <span>{label} min</span>
                  <span>{count}</span>
                </div>
                <div className="progress" style={{ height: 14 }}>
                  <div
                    className="progress-bar bg-primary"
                    style={{ width: `${(count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card p-3">
            <h6 className="mb-3">Busiest 5 Slots</h6>
            {!data.busiestSlots?.length ? (
              <p className="text-muted small">No data yet.</p>
            ) : (
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Slot</th>
                    <th>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.busiestSlots.map((s, i) => (
                    <tr key={s._id}>
                      <td>{i + 1}</td>
                      <td>{s.slotTitle}</td>
                      <td><span className="badge bg-success">{s.bookingCount}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12">
          <div className="card p-3">
            <h6 className="mb-3">Last 14 Days — Bookings per Day</h6>
            <DayChart data={data.last14DaysSeries || []} />
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="col-sm-6 col-lg-4">
      <div className={`card text-white bg-${color}`}>
        <div className="card-body py-3">
          <div className="small">{label}</div>
          <div className="fs-4 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function DayChart({ data }) {
  if (!data.length) return <p className="text-muted small">No data yet.</p>;

  const max = Math.max(...data.map((d) => d.bookings), 1);

  return (
    <div className="d-flex align-items-end gap-2" style={{ overflowX: 'auto', minHeight: 120 }}>
      {data.map((d) => (
        <div key={d._id} className="d-flex flex-column align-items-center" style={{ minWidth: 40 }}>
          <div className="small text-muted mb-1">{d.bookings}</div>
          <div
            className="bg-primary rounded-top"
            style={{ width: 28, height: `${(d.bookings / max) * 100}px`, minHeight: 4 }}
          />
          <div className="small text-muted mt-1" style={{ fontSize: '0.65rem' }}>
            {d._id.slice(5)}
          </div>
        </div>
      ))}
    </div>
  );
}
