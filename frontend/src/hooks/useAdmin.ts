import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { authService } from '@/lib/auth-service';

export function useAdmin() {
  const { authStatus } = useAuthenticator();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (authStatus !== 'authenticated') {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const admin = await authService.isAdmin();
        setIsAdmin(admin);
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [authStatus]);

  return { isAdmin, isLoading };
}
