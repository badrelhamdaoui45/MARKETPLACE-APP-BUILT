
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

              {/* Protected Routes */}
              <Route path="/photographer/dashboard" element={<PhotographerDashboard />} />
              <Route path="/photographer/settings" element={<PhotographerSettings />} />
              <Route path="/photographer/packages" element={<PackageSettings />} />
              <Route path="/photographer/albums/new" element={<CreateAlbum />} />
              <Route path="/photographer/albums/:albumTitle/edit" element={<AlbumDetails />} />
              <Route path="/photographer/upload" element={<UploadPage />} />

              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/my-purchases" element={<RunnerProfile />} />
              <Route path="/my-purchases/:albumId" element={<AlbumDownload />} />

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
