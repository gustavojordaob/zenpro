"use client";

import type { User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  carregarPerfilUsuario,
  salvarPerfilUsuario,
  type SalvarPerfilInput,
} from "./perfilService";
import type { PerfilUsuario } from "./perfilTypes";
import { perfilCompleto } from "./perfilUtils";

type UsePerfilUsuarioResult = {
  perfil: PerfilUsuario | null;
  carregando: boolean;
  completo: boolean;
  salvar: (dados: SalvarPerfilInput) => Promise<void>;
  recarregar: () => Promise<void>;
};

export function usePerfilUsuario(user: User | null): UsePerfilUsuarioResult {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(Boolean(user));

  const recarregar = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const dados = await carregarPerfilUsuario(user);
      setPerfil(dados);
    } finally {
      setCarregando(false);
    }
  }, [user]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const salvar = useCallback(
    async (dados: SalvarPerfilInput) => {
      if (!user) throw new Error("Usuário não autenticado.");
      await salvarPerfilUsuario(user, dados);
      await recarregar();
    },
    [user, recarregar],
  );

  return {
    perfil,
    carregando,
    completo: perfil ? perfilCompleto(perfil) : false,
    salvar,
    recarregar,
  };
}
