import { Authenticator, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFeedStore } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSourcesStore } from '@/store/sourcesStore';
import { authTheme } from '@/lib/amplify-theme';
import { AuthLayout } from '@/components/AuthLayout';
import Index from './pages/Index';
import Settings from './pages/Settings';
import Sources from './pages/Sources';
import NotFound from './pages/NotFound';

// Protected route wrapper - redirects to home if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuthenticator();

  if (authStatus !== 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Auth page at /auth
function AuthPage() {
  return (
    <AuthLayout>
      <Authenticator />
    </AuthLayout>
  );
}

function AppContent() {
  const { authStatus, signOut } = useAuthenticator();
  const isAuthenticated = authStatus === 'authenticated';

  const loadArticles = useFeedStore((state) => state.loadArticles);
  const setAuthenticated = useFeedStore((state) => state.setAuthenticated);
  const setSentimentFilters = useFeedStore((state) => state.setSentimentFilters);
  const loadPreferences = useSettingsStore((state) => state.loadPreferences);
  const loadSources = useSourcesStore((state) => state.loadSources);
  const preferences = useSettingsStore((state) => state.preferences);

  // Update auth state in store when it changes
  useEffect(() => {
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      // Authenticated: load sources (creates subscriptions if needed), then articles and preferences
      loadSources().then(() => loadArticles());
      loadPreferences();
    } else {
      // Public: just load articles (from system sources)
      loadArticles();
    }
  }, [isAuthenticated, loadSources, loadArticles, loadPreferences]);

  // Sync sentiment filters from preferences to feed store (authenticated only)
  useEffect(() => {
    if (isAuthenticated && preferences?.sentimentFilters) {
      setSentimentFilters(preferences.sentimentFilters);
    }
  }, [isAuthenticated, preferences?.sentimentFilters, setSentimentFilters]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Index
                signOut={isAuthenticated ? signOut : undefined}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route
            path="/auth"
            element={<AuthPage />}
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings signOut={signOut ?? (() => {})} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sources"
            element={
              <ProtectedRoute>
                <Sources signOut={signOut ?? (() => {})} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={authTheme}>
      <Authenticator.Provider>
        <AppContent />
      </Authenticator.Provider>
    </ThemeProvider>
  );
}
