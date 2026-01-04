import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useFeedStore } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import Index from './pages/Index';
import Settings from './pages/Settings';
import Sources from './pages/Sources';
import NotFound from './pages/NotFound';

interface AuthenticatedAppProps {
  signOut: () => void;
}

function AuthenticatedApp({ signOut }: AuthenticatedAppProps) {
  const loadArticles = useFeedStore((state) => state.loadArticles);
  const loadPreferences = useSettingsStore((state) => state.loadPreferences);

  useEffect(() => {
    loadArticles();
    loadPreferences();
  }, [loadArticles, loadPreferences]);

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
