import { Authenticator, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedStore } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFeedQuery, useSourcesQuery } from '@/hooks/useFeedQuery';
import { authTheme } from '@/lib/amplify-theme';
import { AuthLayout } from '@/components/AuthLayout';
import { SEO } from '@/components/SEO';
import { WebSiteJsonLd, WebApplicationJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
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

// Auth page component - redirects to home if already authenticated
function AuthPage({ initialState }: { initialState: 'signIn' | 'signUp' }) {
  const { authStatus, toSignIn, toSignUp } = useAuthenticator();
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  // Sync Amplify's internal state with the route (only on path change)
  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      if (initialState === 'signUp') {
        toSignUp();
      } else {
        toSignIn();
      }
    }
  }, [location.pathname, initialState, toSignIn, toSignUp]);

  if (authStatus === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SEO />
      <AuthLayout>
        <Authenticator initialState={initialState} />
      </AuthLayout>
    </>
  );
}

function AppContent() {
  const { authStatus, signOut } = useAuthenticator();
  const isAuthenticated = authStatus === 'authenticated';

  const setArticles = useFeedStore((state) => state.setArticles);
  const setLoading = useFeedStore((state) => state.setLoading);
  const setError = useFeedStore((state) => state.setError);
  const setAuthenticated = useFeedStore((state) => state.setAuthenticated);
  const setSentimentFilters = useFeedStore((state) => state.setSentimentFilters);
  const loadPreferences = useSettingsStore((state) => state.loadPreferences);
  const preferences = useSettingsStore((state) => state.preferences);
  const queryClient = useQueryClient();

  // Invalidate feed cache when auth status changes to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [isAuthenticated, queryClient]);

  // Prefetch sources for authenticated users (cached for Sources page)
  useSourcesQuery(isAuthenticated);

  // Use React Query for feed data with caching
  const { data: articles, isLoading, error } = useFeedQuery(isAuthenticated);

  // Sync React Query state to feedStore for components that read from it
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (articles) {
      setArticles(articles);
    }
  }, [articles, setArticles]);

  useEffect(() => {
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load articles');
    }
  }, [error, setError]);

  // Update auth state in store when it changes
  useEffect(() => {
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  // Load preferences for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      loadPreferences();
    }
  }, [isAuthenticated, loadPreferences]);

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
              <>
                <WebSiteJsonLd />
                <WebApplicationJsonLd />
                <OrganizationJsonLd />
                <Index
                  signOut={isAuthenticated ? signOut : undefined}
                  isAuthenticated={isAuthenticated}
                />
              </>
            }
          />
          <Route
            path="/auth/login"
            element={<AuthPage initialState="signIn" />}
          />
          <Route
            path="/auth/register"
            element={<AuthPage initialState="signUp" />}
          />
          {/* Redirect /auth to /auth/login */}
          <Route
            path="/auth"
            element={<Navigate to="/auth/login" replace />}
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
