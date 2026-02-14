
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import PhotographerDashboard from './pages/PhotographerDashboard';
import CreateAlbum from './pages/CreateAlbum';
import AlbumDetails from './pages/AlbumDetails';
import UploadPage from './pages/UploadPage';
import PackageSettings from './pages/PackageSettings';
import AlbumDownload from './pages/AlbumDownload';
import PublicAlbumView from './pages/PublicAlbumView';
import RunnerProfile from './pages/RunnerProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminPhotographerDetails from './pages/AdminPhotographerDetails';
import PhotographerProfile from './pages/PhotographerProfile';
import PhotographerSettings from './pages/PhotographerSettings';
import Albums from './pages/Albums';
import Home from './pages/Home';
import BlogPost from './pages/BlogPost';
import Cart from './pages/Cart';
import Contact from './pages/Contact';
import { CartProvider } from './context/CartContext';
import DynamicPopup from './components/DynamicPopup';
import FloatingCart from './components/FloatingCart';
import Onboarding from './pages/Onboarding';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import FAQ from './pages/FAQ';
import Footer from './components/Footer';

import ProtectedRoute from './components/auth/ProtectedRoute';
import './test-stripe-connection'; // Debugging Tool re-enabled for troubleshooting

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            <FloatingCart />
            <DynamicPopup type="announcement" />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/cart" element={<Cart />} />

              {/* Public Viewing Route */}
              <Route path="/albums/:photographerName/:albumTitle" element={<PublicAlbumView />} />
              <Route path="/photographer/:name" element={<PhotographerProfile />} />
              <Route path="/blog/:slug" element={<BlogPost />} />

              {/* Protected Photographer Routes */}
              <Route
                path="/photographer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <PhotographerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/settings"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <PhotographerSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/packages"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <PackageSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/albums/new"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <CreateAlbum />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/albums/:albumTitle/edit"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <AlbumDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/upload"
                element={
                  <ProtectedRoute allowedRoles={['photographer', 'admin']}>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/photographer/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPhotographerDetails />
                  </ProtectedRoute>
                }
              />

              {/* Protected User Routes */}
              <Route
                path="/my-purchases"
                element={
                  <ProtectedRoute>
                    <RunnerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-purchases/:albumId"
                element={
                  <ProtectedRoute>
                    <AlbumDownload />
                  </ProtectedRoute>
                }
              />

              <Route path="/contact" element={<Contact />} />

              {/* Legal Routes */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/faq" element={<FAQ />} />

            </Routes>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
