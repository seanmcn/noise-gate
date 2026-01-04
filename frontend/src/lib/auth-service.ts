import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getCurrentUser,
} from 'aws-amplify/auth';

export interface AuthUser {
  id: string;
  email: string;
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
      return {
        id: user.userId,
        email: user.signInDetails?.loginId || '',
      };
    } catch {
      return null;
    }
  },
};
