"use client";

import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { COLECOES, type PapelUsuario } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

type PapelContextValue = {
  papel: PapelUsuario | null;
  lojaId: string | null;
  /** true enquanto auth ou papel ainda não resolvidos */
  carregando: boolean;
  isRevendedor: boolean;
  isMarca: boolean;
  /** Pode entrar no portal /revendedor */
  podeAcessarPortalRevendedor: boolean;
};

const PapelContext = createContext<PapelContextValue | null>(null);

async function lerPapelUsuario(
  uid: string,
): Promise<{ papel: PapelUsuario | null; lojaId: string | null }> {
  if (!isFirebaseConfigured()) return { papel: null, lojaId: null };
  const snap = await getDoc(doc(getFirebaseDb(), COLECOES.USUARIOS, uid));
  if (!snap.exists()) return { papel: null, lojaId: null };
  const data = snap.data();
  const papel =
    data.papel === "marca" || data.papel === "revendedor" ? data.papel : null;
  return {
    papel,
    lojaId: typeof data.lojaId === "string" ? data.lojaId : null,
  };
}

export function PapelUsuarioProvider({ children }: { children: ReactNode }) {
  const { user, carregando: authCarregando } = useAuth();
  const [papel, setPapel] = useState<PapelUsuario | null>(null);
  const [lojaId, setLojaId] = useState<string | null>(null);
  /** false até sabermos o papel (ou que não há user) */
  const [papelResolvido, setPapelResolvido] = useState(false);

  useEffect(() => {
    if (authCarregando) {
      setPapelResolvido(false);
      return;
    }

    if (!user) {
      setPapel(null);
      setLojaId(null);
      setPapelResolvido(true);
      return;
    }

    let cancelled = false;
    setPapelResolvido(false);
    void lerPapelUsuario(user.uid)
      .then((r) => {
        if (cancelled) return;
        setPapel(r.papel);
        setLojaId(r.lojaId);
      })
      .catch((err) => {
        console.error("Falha ao ler papel do usuário", err);
        if (cancelled) return;
        setPapel(null);
        setLojaId(null);
      })
      .finally(() => {
        if (!cancelled) setPapelResolvido(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authCarregando]);

  const value = useMemo<PapelContextValue>(() => {
    const isRevendedor = papel === "revendedor";
    const isMarca = papel === "marca";
    return {
      papel,
      lojaId,
      carregando: authCarregando || !papelResolvido,
      isRevendedor,
      isMarca,
      // Marca também pode inspecionar o portal atacado
      podeAcessarPortalRevendedor: isRevendedor || isMarca,
    };
  }, [papel, lojaId, authCarregando, papelResolvido]);

  return (
    <PapelContext.Provider value={value}>{children}</PapelContext.Provider>
  );
}

export function usePapelUsuario(): PapelContextValue {
  const ctx = useContext(PapelContext);
  if (!ctx) {
    throw new Error("usePapelUsuario deve ser usado dentro de PapelUsuarioProvider");
  }
  return ctx;
}
