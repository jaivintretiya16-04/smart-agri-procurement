import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/guards/ProtectedRoute';

import { HomePage } from './pages/public/HomePage';
import { CentersPage } from './pages/public/CentersPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { FarmerDashboard } from './pages/farmer/FarmerDashboard';
import { MyBookingsPage } from './pages/farmer/MyBookingsPage';
import { LiveQueueTrackerPage } from './pages/farmer/LiveQueueTrackerPage';
import { ReceiptsPage } from './pages/farmer/ReceiptsPage';
import { OperatorDashboard } from './pages/operator/OperatorDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/centers" element={<CentersPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Shared Protected Profile */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Farmer Routes */}
                <Route
                  path="/farmer"
                  element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <FarmerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/bookings"
                  element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <MyBookingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/queue"
                  element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <LiveQueueTrackerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/receipts"
                  element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <ReceiptsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Operator Routes */}
                <Route
                  path="/operator"
                  element={
                    <ProtectedRoute allowedRoles={['operator']}>
                      <OperatorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
