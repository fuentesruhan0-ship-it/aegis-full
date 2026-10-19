// @ts-nocheck
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import SOS from '@/pages/SOS';
import Household from '@/pages/Household';
import EmergencyContacts from '@/pages/EmergencyContacts';
import Assistant from '@/pages/Assistant';
import HazardReports from '@/pages/HazardReports';
import Announcements from '@/pages/Announcements';
import Profile from '@/pages/Profile';
import CommunityMap from '@/pages/CommunityMap';
import RiskAssessment from '@/pages/RiskAssessment';
import GoBag from '@/pages/GoBag';
import DrillScheduler from '@/pages/DrillScheduler';
import KnowledgeHub from '@/pages/KnowledgeHub';
import EvacuationLocator from '@/pages/EvacuationLocator';
import DamageVault from '@/pages/DamageVault';
import InfrastructureStatus from '@/pages/InfrastructureStatus';
import RecoveryTracker from '@/pages/RecoveryTracker';
import VolunteerCoordination from '@/pages/VolunteerCoordination';
import ModerationQueue from '@/pages/ModerationQueue';
import { Navigate } from 'react-router-dom';
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { ClerkAuthSync, CLERK_PUBLISHABLE_KEY, isClerkConfigured } from '@/lib/clerkSync';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle critical user registration errors
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/landing" element={<Landing />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* SSO Callback for Clerk */}
      <Route
        path="/sso-callback"
        element={
          <div className="fixed inset-0 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Completing sign-in...</p>
              <AuthenticateWithRedirectCallback
                signInForceRedirectUrl="/"
                signUpForceRedirectUrl="/"
              />
            </div>
          </div>
        }
      />

      {/* Authenticated app routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/landing" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sos" element={<SOS />} />
          <Route path="/household" element={<Household />} />
          <Route path="/contacts" element={<EmergencyContacts />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/hazards" element={<HazardReports />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/map" element={<CommunityMap />} />
          <Route path="/risk-assessment" element={<RiskAssessment />} />
          <Route path="/go-bag" element={<GoBag />} />
          <Route path="/drills" element={<DrillScheduler />} />
          <Route path="/knowledge" element={<KnowledgeHub />} />
          <Route path="/evacuation" element={<EvacuationLocator />} />
          <Route path="/damage-vault" element={<DamageVault />} />
          <Route path="/infrastructure" element={<InfrastructureStatus />} />
          <Route path="/recovery" element={<RecoveryTracker />} />
          <Route path="/volunteers" element={<VolunteerCoordination />} />
          <Route path="/moderation" element={<ModerationQueue />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function AppContent() {
  return (
    <AuthProvider>
      {isClerkConfigured && <ClerkAuthSync />}
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

function App() {
  if (isClerkConfigured) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <AppContent />
      </ClerkProvider>
    );
  }

  return <AppContent />;
}

export default App;