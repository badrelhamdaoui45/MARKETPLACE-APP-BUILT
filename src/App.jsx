
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
import Marketplace from './pages/Marketplace';
import PackageSettings from './pages/PackageSettings';
import AlbumDownload from './pages/AlbumDownload';
import PublicAlbumView from './pages/PublicAlbumView';
import BuyerProfile from './pages/BuyerProfile';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public Viewing Route */}
            <Route path="/albums/:id" element={<PublicAlbumView />} />

            {/* Protected Routes */}
            <Route path="/photographer/dashboard" element={<PhotographerDashboard />} />
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
    </AuthProvider>
  );
}

export default App;
