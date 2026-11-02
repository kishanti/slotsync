import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './store/authSlice';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/Dashboard';
import StudentBookings from './pages/student/MyBookings';
import CounsellorDashboard from './pages/counsellor/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSlots from './pages/admin/Slots';

export default function App() {
  const dispatch = useDispatch();
  const { token, user, initialized } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(getMe());
    }
    // if no token, nothing to fetch — app is ready immediately
  }, []);

  // only block render when we have a token but haven't confirmed who the user is yet
  // (page refresh case — wait for /me to come back)
  if (token && !user && !initialized) {
    return (
      <div className="spinner-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === 'student' && <StudentDashboard />}
              {user?.role === 'counsellor' && <CounsellorDashboard />}
              {user?.role === 'admin' && <AdminDashboard />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute role="student">
              <StudentBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/slots"
          element={
            <ProtectedRoute role="admin">
              <AdminSlots />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
