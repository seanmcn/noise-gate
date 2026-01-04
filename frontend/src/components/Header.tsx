import { Activity, Settings, LogOut, Rss } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  signOut?: () => void;
}

export function Header({ signOut }: HeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-8 h-8 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30 animate-pulse-glow" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight">
            <span className="text-gradient">NOISE</span>
            <span className="text-foreground">GATE</span>
          </h1>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="vu-meter">
            <div className="vu-bar h-2 bg-sentiment-positive" />
            <div className="vu-bar h-3 bg-sentiment-positive" />
            <div className="vu-bar h-4 bg-sentiment-neutral" />
            <div className="vu-bar h-3 bg-sentiment-neutral" />
            <div className="vu-bar h-2 bg-sentiment-negative" />
          </div>
          
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

          {signOut && (
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
