"use client";

import { useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { enviarContato } from "@/features/loja/enviarContato";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviadoId, setEnviadoId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!isFirebaseConfigured()) {
      setErro("Firebase não configurado. Verifique o .env.local.");
      return;
    }

    setEnviando(true);
    try {
      const id = await enviarContato({ nome, email, telefone, comentario });
      setEnviadoId(id);
      setNome("");
      setEmail("");
      setTelefone("");
      setComentario("");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível enviar sua mensagem. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <PageBackLink href="/" />

        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Contato
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Envie sua dúvida ou pedido. A mensagem chega direto para a equipe
          Zenpro.
        </p>

        {enviadoId ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-emerald-900">
              Mensagem enviada!
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              Recebemos seu contato e retornaremos em breve pelo e-mail
              informado.
            </p>
            <button
              type="button"
              onClick={() => setEnviadoId(null)}
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Nome</span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">E-mail</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Telefone</span>
              <input
                type="tel"
                required
                minLength={8}
                maxLength={20}
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Comentário
              </span>
              <textarea
                required
                minLength={5}
                maxLength={2000}
                rows={5}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Como podemos ajudar?"
                className="w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar mensagem"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
