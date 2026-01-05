import { Header } from './Header';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for authentication pages.
 * Includes the site header and centers the auth content.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  );
}
