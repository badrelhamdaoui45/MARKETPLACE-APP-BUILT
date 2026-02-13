import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SkeletonPage from '../ui/SkeletonPage';

/**
 * A wrapper component for routes that require authentication and/or specific roles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Array<string>} [props.allowedRoles] - Optional list of roles allowed to access this route
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (loading) {
        return <SkeletonPage />;
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check for role-based access if allowedRoles are specified
    if (allowedRoles.length > 0 && profile) {
        if (!allowedRoles.includes(profile.role)) {
            // Redirect to home or a specific unauthorized page if role doesn't match
            console.warn(`Access denied: User role '${profile.role}' is not in allowed roles [${allowedRoles.join(', ')}]`);
            return <Navigate to="/" replace />;
        }
    }

    // Render children if all checks pass
    return children;
};

export default ProtectedRoute;
