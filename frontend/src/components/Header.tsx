import { Activity, Settings, LogOut, Rss, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface HeaderProps {
  signOut?: () => void;
  isAuthenticated?: boolean;
}

export function Header({ signOut, isAuthenticated = false }: HeaderProps) {
  const { isAdmin } = useAdmin();

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-8 h-8 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30 animate-pulse-glow" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight">
            <span className="text-gradient">MIN</span>
            <span className="text-foreground">FEED</span>
          </h1>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/sources"
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="RSS Sources"
              >
                <Rss className="w-5 h-5" />
              </Link>

              <Link
                to="/settings"
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  title="Admin"
                >
                  <Shield className="w-5 h-5" />
                </Link>
              )}

              {signOut && (
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                to="/auth/register"
                data-tour="register"
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium text-sm"
              >
                Register
              </Link>
              <Link
                to="/auth/login"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
