"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  carregarSessaoAdmin,
  type SessaoAdmin,
} from "@/features/admin/adminAuthService";
import { ensureMarcaLoja } from "@/features/multitenant/marcaLoja";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

type AdminAuthContextValue = {
  user: User | null;
  sessao: SessaoAdmin | null;
  uid: string | null;
  papel: SessaoAdmin["papel"] | null;
  lojaId: string | null;
  carregando: boolean;
  recarregarSessao: () => Promise<void>;
  isMarca: boolean;
  isRevendedor: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessao, setSessao] = useState<SessaoAdmin | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarSessao = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setSessao(null);
      return;
    }

    const next = await carregarSessaoAdmin(authUser.uid, authUser.email);
    setSessao(next);

    // Dono (marca): garante que a loja oficial exista para receber pedidos da raiz.
    if (next?.papel === "marca") {
      void ensureMarcaLoja(authUser.uid, authUser.email).catch((error) => {
        console.error("Falha ao garantir loja da marca", error);
      });
    }
  }, []);

  const recarregarSessao = useCallback(async () => {
    await carregarSessao(user);
  }, [carregarSessao, user]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setCarregando(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setCarregando(true);
      void carregarSessao(nextUser).finally(() => setCarregando(false));
    });

    return unsubscribe;
  }, [carregarSessao]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      sessao,
      uid: user?.uid ?? null,
      papel: sessao?.papel ?? null,
      lojaId: sessao?.lojaId ?? null,
      carregando,
      recarregarSessao,
      isMarca: sessao?.papel === "marca",
      isRevendedor: sessao?.papel === "revendedor",
    }),
    [user, sessao, carregando, recarregarSessao],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAuthAdmin(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAuthAdmin deve ser usado dentro de AdminAuthProvider");
  }
  return ctx;
}
