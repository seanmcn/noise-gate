import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useFeedStore } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSourcesStore } from '@/store/sourcesStore';
import Index from './pages/Index';
import Settings from './pages/Settings';
import Sources from './pages/Sources';
import NotFound from './pages/NotFound';

interface AuthenticatedAppProps {
  signOut: () => void;
}

function AuthenticatedApp({ signOut }: AuthenticatedAppProps) {
  const loadArticles = useFeedStore((state) => state.loadArticles);
  const setSentimentFilters = useFeedStore((state) => state.setSentimentFilters);
  const loadPreferences = useSettingsStore((state) => state.loadPreferences);
  const loadSources = useSourcesStore((state) => state.loadSources);
  const preferences = useSettingsStore((state) => state.preferences);

  useEffect(() => {
    // Load sources first (creates subscriptions if needed), then articles
    loadSources().then(() => loadArticles());
    loadPreferences();
  }, [loadSources, loadArticles, loadPreferences]);

  // Sync sentiment filters from preferences to feed store
  useEffect(() => {
    if (preferences?.sentimentFilters) {
      setSentimentFilters(preferences.sentimentFilters);
    }
  }, [preferences?.sentimentFilters, setSentimentFilters]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index signOut={signOut} />} />
          <Route path="/settings" element={<Settings signOut={signOut} />} />
          <Route path="/sources" element={<Sources signOut={signOut} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut }) => <AuthenticatedApp signOut={signOut ?? (() => {})} />}
    </Authenticator>
  );
}
