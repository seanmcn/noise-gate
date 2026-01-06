import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

export interface AuthUser {
  id: string;
  email: string;
  groups: string[];
}

export const authService = {
  /**
   * Sign in with email and password.
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    await cognitoSignIn({ username: email, password });
    return authService.getCurrentUser() as Promise<AuthUser>;
  },

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    await cognitoSignOut();
  },

  /**
   * Get the currently authenticated user, or null if not authenticated.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups =
        (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) ||
        [];

      return {
        id: user.userId,
        email: user.signInDetails?.loginId || '',
        groups,
      };
    } catch {
      return null;
    }
  },

  /**
   * Check if the current user is in the admin group.
   */
  async isAdmin(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      const groups =
        (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) ||
        [];
      return groups.includes('admin');
    } catch {
      return false;
    }
  },
};
