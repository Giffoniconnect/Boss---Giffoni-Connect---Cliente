import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'boss_admin' | 'client' | 'partner' | 'outsourced';

interface UserProfile {
  email: string;
  role: UserRole;
  clientId?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Check if it's the bootstrap admin
            // BOOTSTRAP ADMIN DE PREVIEW — revisar antes de produção real.
            if (firebaseUser.email === 'direito.rgr@gmail.com') {
              const bootstrapProfile: UserProfile = {
                email: firebaseUser.email,
                role: 'boss_admin'
              };
              try {
                await setDoc(docRef, {
                  ...bootstrapProfile,
                  createdAt: serverTimestamp()
                });
              } catch (writeErr) {
                console.error("Erro ao auto-registrar o admin no banco:", writeErr);
              }
              setProfile(bootstrapProfile);
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const loginWithGoogle = async (role?: UserRole) => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const newUser = result.user;

      // 1. Check by UID directly
      const docRef = doc(db, 'users', newUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
        return;
      }

      // 2. Check by Email if no UID profile exists (Mapping legacy/invited users)
      const usersQ = query(collection(db, 'users'), where('email', '==', newUser.email));
      const usersSnap = await getDocs(usersQ);
      
      if (!usersSnap.empty) {
        const foundData = usersSnap.docs[0].data() as UserProfile;
        // Migration: Link the UID to the email record
        await setDoc(docRef, {
          ...foundData,
          uid: newUser.uid,
          updatedAt: serverTimestamp()
        });
        setProfile(foundData);
        return;
      }

      // 3. New User / Bootstrap admin
      if (role || newUser.email === 'direito.rgr@gmail.com') {
        const newProfile: UserProfile = {
          email: newUser.email || '',
          role: role || (newUser.email === 'direito.rgr@gmail.com' ? 'boss_admin' : 'client'),
        };
        await setDoc(docRef, {
          ...newProfile,
          createdAt: serverTimestamp()
        });
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("Login falhou:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'boss_admin' || user?.email === 'direito.rgr@gmail.com',
    isClient: profile?.role === 'client',
    logout,
    loginWithGoogle
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
