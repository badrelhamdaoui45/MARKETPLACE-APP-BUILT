
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
import BuyerProfile from './pages/BuyerProfile';
import AdminDashboard from './pages/AdminDashboard';
import PhotographerProfile from './pages/PhotographerProfile';
import PhotographerSettings from './pages/PhotographerSettings';
import Albums from './pages/Albums';
import Home from './pages/Home';
import Cart from './pages/Cart';
import { CartProvider } from './context/CartContext';
import AnnouncementPopup from './components/AnnouncementPopup';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            <AnnouncementPopup />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/cart" element={<Cart />} />

              {/* Public Viewing Route */}
              <Route path="/albums/:photographerName/:albumTitle" element={<PublicAlbumView />} />
              <Route path="/photographer/:name" element={<PhotographerProfile />} />

              {/* Protected Routes */}
              <Route path="/photographer/dashboard" element={<PhotographerDashboard />} />
              <Route path="/photographer/settings" element={<PhotographerSettings />} />
              <Route path="/photographer/packages" element={<PackageSettings />} />
              <Route path="/photographer/albums/new" element={<CreateAlbum />} />
              <Route path="/photographer/albums/:id" element={<AlbumDetails />} />
              <Route path="/photographer/upload" element={<UploadPage />} />

              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/my-purchases" element={<BuyerProfile />} />
              <Route path="/my-purchases/:albumId" element={<AlbumDownload />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
