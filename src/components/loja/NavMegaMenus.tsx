"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listarMarcasAtivas,
  listarModelosAtivos,
} from "@/features/catalogo/catalogoRuntimeService";
import {
  TERMICOS_SUBTIPOS,
} from "@/features/loja/categoriasVitrine";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { isFirebaseConfigured } from "@/lib/firebase";

type MarcaItem = { id: string; nome: string };
type ModeloItem = { id: string; nome: string; marcaId: string };

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-zinc-400"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Capinhas: marcas → modelos (estilo Gocase). */
export function NavDropdownCapinhas({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const paths = useLojaPaths();
  const [aberto, setAberto] = useState(false);
  const [marcaHover, setMarcaHover] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<MarcaItem[]>([]);
  const [modelos, setModelos] = useState<ModeloItem[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    void Promise.all([listarMarcasAtivas(), listarModelosAtivos()]).then(
      ([m, mod]) => {
        setMarcas(
          [...m]
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((x) => ({ id: x.id, nome: x.nome })),
        );
        setModelos(
          mod.map((x) => ({ id: x.id, nome: x.nome, marcaId: x.marcaId })),
        );
      },
    );
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setAberto(false);
        setMarcaHover(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const modelosDaMarca = useMemo(() => {
    if (!marcaHover) return [];
    return modelos
      .filter((m) => m.marcaId === marcaHover)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [modelos, marcaHover]);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAberto(true);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setAberto(false);
      setMarcaHover(null);
    }, 180);
  }

  const hrefBase = paths.categoria("capinhas");

  return (
    <div
      ref={rootRef}
      className={`relative ${className ?? ""}`}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={hrefBase}
        className={`inline-flex items-center gap-1 transition ${
          aberto ? "text-gold-dark" : "text-zinc-600 hover:text-gold-dark"
        }`}
        onClick={onNavigate}
      >
        Capinhas
        <ChevronDown />
      </Link>
      {aberto && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="flex max-h-[min(70vh,28rem)] max-w-[min(100vw-1.5rem,36rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            <ul className="min-w-[10rem] max-w-[12rem] shrink-0 overflow-y-auto py-2">
              <li>
                <Link
                  href={hrefBase}
                  className="block px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  onClick={() => {
                    setAberto(false);
                    onNavigate?.();
                  }}
                >
                  Ver todas
                </Link>
              </li>
              {marcas.map((m) => (
                <li
                  key={m.id}
                  onMouseEnter={() => setMarcaHover(m.id)}
                >
                  <Link
                    href={`${hrefBase}?marca=${encodeURIComponent(m.id)}`}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                      marcaHover === m.id
                        ? "bg-zinc-50 text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    onClick={() => {
                      setAberto(false);
                      onNavigate?.();
                    }}
                  >
                    {m.nome}
                    <ChevronRight />
                  </Link>
                </li>
              ))}
            </ul>
            {marcaHover && modelosDaMarca.length > 0 && (
              <ul className="max-h-[min(70vh,28rem)] min-w-[11rem] flex-1 overflow-y-auto border-l border-zinc-100 py-2">
                {modelosDaMarca.map((mod) => (
                  <li key={mod.id}>
                    <Link
                      href={`${hrefBase}?marca=${encodeURIComponent(marcaHover)}&modelo=${encodeURIComponent(mod.id)}`}
                      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                      onClick={() => {
                        setAberto(false);
                        onNavigate?.();
                      }}
                    >
                      {mod.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Térmicos: tipos (estilo Gocase). */
export function NavDropdownTermicos({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const paths = useLojaPaths();
  const [aberto, setAberto] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAberto(true);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAberto(false), 180);
  }

  const hrefBase = paths.categoria("termicos");

  return (
    <div
      ref={rootRef}
      className={`relative ${className ?? ""}`}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={hrefBase}
        className={`inline-flex items-center gap-1 transition ${
          aberto ? "text-gold-dark" : "text-zinc-600 hover:text-gold-dark"
        }`}
        onClick={onNavigate}
      >
        Térmicos
        <ChevronDown />
      </Link>
      {aberto && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <ul className="min-w-[12rem] rounded-xl border border-zinc-200 bg-white py-2 shadow-lg">
            <li>
              <Link
                href={hrefBase}
                className="block px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                onClick={() => {
                  setAberto(false);
                  onNavigate?.();
                }}
              >
                Ver todos
              </Link>
            </li>
            {TERMICOS_SUBTIPOS.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${hrefBase}?sub=${encodeURIComponent(s.id)}`}
                  className="block px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={() => {
                    setAberto(false);
                    onNavigate?.();
                  }}
                >
                  {s.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
