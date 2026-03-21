import type { Auth } from "firebase/auth";

export type FirebaseAuthPlugin = {
  auth: Auth;
  whenReady: Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  signOutUser(): Promise<void>;
};

declare module "#app" {
  interface NuxtApp {
    $firebaseAuth: FirebaseAuthPlugin | null;
  }
}

export {};
