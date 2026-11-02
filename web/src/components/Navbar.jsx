import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  async function handleLogout() {
    await dispatch(logout());
    navigate('/login');
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">SlotSync</Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navLinks"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navLinks">
          <ul className="navbar-nav me-auto">
            {user?.role === 'student' && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/">Browse Slots</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/my-bookings">My Bookings</Link>
                </li>
              </>
            )}
            {user?.role === 'counsellor' && (
              <li className="nav-item">
                <Link className="nav-link" to="/">My Schedule</Link>
              </li>
            )}
            {user?.role === 'admin' && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/">Analytics</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/slots">Manage Slots</Link>
                </li>
              </>
            )}
          </ul>

          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item me-2">
              <span className="nav-link text-white-50">
                {user?.name}
                <span className="badge bg-light text-dark ms-2">{user?.role}</span>
              </span>
            </li>
            <li className="nav-item">
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
