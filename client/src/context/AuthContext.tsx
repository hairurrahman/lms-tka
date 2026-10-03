import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEMO_MODE } from '@/lib/firebase';
import { MOCK_USERS, type AppUser, type Role } from '@/lib/mockData';
import { getUser, getUserByNisn, getAllUsers, updateUser, verifyStaffLogin, createUser, setUserPassword, hashPassword } from '@/services/dataStore';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  /** Guru & Administrator now log in with PASSWORD ONLY — no name/username
   *  needed, since each staff member's password must be unique. */
  signIn: (password: string) => Promise<void>;
  signInWithNisn: (nisn: string) => Promise<void>;
  signOut: () => void;
  loginAsDemo: (userId: string) => void;
  demoMode: boolean;
  /** Administrator self-service: change username and/or password from Pengaturan. */
  changeOwnCredentials: (params: { newUsername?: string; currentPassword: string; newPassword?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// No Firebase Authentication anywhere in this app — every role (siswa, guru,
// administrator) is a plain Firestore document, and "being logged in" just
// means we remember which document id in this browser's localStorage.
const SESSION_KEY = 'lms_session_user_id';
let demoSession: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      // Demo: no persistent session (so it doesn't fight sandboxed previews).
      if (demoSession) {
        const u = MOCK_USERS.find((x) => x.id === demoSession);
        setUser(u ?? null);
      }
      setLoading(false);
      return;
    }

    const storedId = localStorage.getItem(SESSION_KEY);
    if (!storedId) {
      setLoading(false);
      return;
    }
    getUser(storedId)
      .then((u) => {
        if (u) setUser(u);
        else localStorage.removeItem(SESSION_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginAsDemo = (userId: string) => {
    const u = MOCK_USERS.find((x) => x.id === userId);
    if (u) {
      demoSession = userId;
      setUser(u);
    }
  };

  /** Guru/Administrator login — password only. Also handles the default
   *  admin/admin123 account: creates it the very first time ever, and
   *  self-heals an old administrator doc left over from an earlier version
   *  of this app that didn't store a password (so it never matches above). */
  const signIn = async (password: string) => {
    const match = await verifyStaffLogin(password);
    if (match) {
      if (DEMO_MODE) demoSession = match.id;
      else localStorage.setItem(SESSION_KEY, match.id);
      setUser(match);
      return;
    }

    if (password === 'admin123') {
      const allUsers = DEMO_MODE ? MOCK_USERS : await getAllUsers();
      const orphanAdmin = allUsers.find((u) => u.role === 'administrator' && !u.password);

      if (orphanAdmin) {
        // Heal an admin account from an older version of the app (it exists
        // but never had a password stored) instead of blocking forever.
        await setUserPassword(orphanAdmin.id, 'admin123');
        const healed = { ...orphanAdmin, password: await hashPassword('admin123') };
        if (DEMO_MODE) demoSession = healed.id;
        else localStorage.setItem(SESSION_KEY, healed.id);
        setUser(healed);
        return;
      }

      const anyRealAdminExists = allUsers.some((u) => u.role === 'administrator' && u.password);
      if (!anyRealAdminExists) {
        const created = await createUser(
          { name: 'Administrator', username: 'admin', role: 'administrator', avatar: '👨‍💼' },
          'admin123'
        );
        if (DEMO_MODE) demoSession = created.id;
        else localStorage.setItem(SESSION_KEY, created.id);
        setUser(created);
        return;
      }
    }

    throw new Error('Password salah.');
  };

  const signInWithNisn = async (nisn: string) => {
    const trimmed = nisn.trim();
    if (!trimmed) throw new Error('NISN tidak boleh kosong');
    const u = await getUserByNisn(trimmed);
    if (!u) throw new Error('NISN tidak ditemukan. Periksa kembali atau hubungi guru/admin.');
    if (DEMO_MODE) {
      demoSession = u.id;
    } else {
      localStorage.setItem(SESSION_KEY, u.id);
    }
    setUser(u);
  };

  const signOut = () => {
    demoSession = null;
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const changeOwnCredentials: AuthContextValue['changeOwnCredentials'] = async ({ newUsername, currentPassword, newPassword }) => {
    if (!user) throw new Error('Belum login');
    const check = await verifyStaffLogin(currentPassword);
    if (!check || check.id !== user.id) throw new Error('Password saat ini salah.');

    if (newUsername?.trim() && user.role === 'administrator') {
      await updateUser(user.id, { username: newUsername.trim() });
      setUser((u) => (u ? { ...u, username: newUsername.trim() } : u));
    }
    if (newPassword?.trim()) {
      if (newPassword.trim().length < 6) throw new Error('Password baru minimal 6 karakter.');
      await setUserPassword(user.id, newPassword.trim());
    }
  };

  // Refresh user from store whenever the demo store updates (so points/badges
  // earned from quizzes show up live).
  useEffect(() => {
    if (!user) return;
    if (!DEMO_MODE) return;
    let mounted = true;
    (async () => {
      const fresh = await getUser(user.id);
      if (mounted && fresh) setUser(fresh);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.points, user?.badges?.length]);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signInWithNisn, signOut, loginAsDemo, demoMode: DEMO_MODE, changeOwnCredentials }}
    >
      {children}
    </AuthContext.Provider>
  );
}
