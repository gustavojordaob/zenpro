"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeroCaseShowcase } from "@/components/loja/HeroCaseShowcase";
import type { HomeCarouselSlide } from "@/features/loja/homeContent";

type Props = {
  slides: HomeCarouselSlide[];
  intervalMs?: number;
  variant?: "hero" | "compact";
};

function temMidia(slide: HomeCarouselSlide): boolean {
  if (slide.slotVazio) return false;
  if (slide.tipo === "video" && slide.mp4Url) return true;
  return Boolean(slide.imageUrl);
}

function SlideMedia({
  slide,
  ativo,
}: {
  slide: HomeCarouselSlide;
  ativo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || slide.tipo !== "video") return;
    if (ativo) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [ativo, slide.tipo, slide.mp4Url]);

  if (slide.slotVazio || !temMidia(slide)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-800/90 text-zinc-400">
        <svg
          className="mb-2 h-8 w-8 opacity-40 sm:h-10 sm:w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-9a.75.75 0 0 0-.75.75v9a.75.75 0 0 0 .75.75Z"
          />
        </svg>
        <span className="text-[10px] sm:text-xs">Foto ou vídeo em breve</span>
      </div>
    );
  }

  if (slide.tipo === "video" && slide.mp4Url) {
    return (
      <video
        ref={videoRef}
        src={slide.mp4Url}
        poster={slide.imageUrl}
        muted
        playsInline
        loop
        preload={ativo ? "auto" : "metadata"}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.imageUrl}
      alt={slide.titulo}
      className="h-full w-full object-cover"
      loading={ativo ? "eager" : "lazy"}
    />
  );
}

function CtaButton({ slide }: { slide: HomeCarouselSlide }) {
  if (!slide.ctaLabel || !slide.ctaHref) return null;
  return (
    <Link
      href={slide.ctaHref}
      className="mt-5 inline-flex rounded-full border border-white/80 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
    >
      {slide.ctaLabel}
    </Link>
  );
}

function PersonalizacaoSlide({ slide }: { slide: HomeCarouselSlide }) {
  return (
    <div className="grid min-h-[min(62vh,480px)] w-full md:grid-cols-2">
      <div className="flex items-center justify-center bg-[#ececec] px-6 py-10 sm:py-14">
        <HeroCaseShowcase />
      </div>
      <div
        className="flex flex-col justify-center px-8 py-10 sm:px-12"
        style={{
          background:
            slide.painelGradiente ??
            "linear-gradient(145deg, #1c1917 0%, #292524 100%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Personalização no browser
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          {slide.titulo}
        </h2>
        {slide.subtitulo && (
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            {slide.subtitulo}
          </p>
        )}
        <CtaButton slide={slide} />
      </div>
    </div>
  );
}

function TextoSlide({ slide }: { slide: HomeCarouselSlide }) {
  return (
    <div
      className="flex min-h-[min(62vh,480px)] w-full flex-col items-center justify-center px-6 py-14 text-center sm:px-12"
      style={{
        background:
          slide.painelGradiente ??
          "linear-gradient(145deg, #1c1917 0%, #292524 100%)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        Zen Pro
      </p>
      <h2 className="mt-3 max-w-2xl text-3xl font-light uppercase tracking-wide text-white sm:text-4xl lg:text-5xl">
        {slide.titulo}
      </h2>
      {slide.subtitulo && (
        <p className="mt-4 max-w-lg text-sm text-white/75 sm:text-base">
          {slide.subtitulo}
        </p>
      )}
      <CtaButton slide={slide} />
    </div>
  );
}

function SplitSlide({ slide, ativo }: { slide: HomeCarouselSlide; ativo: boolean }) {
  return (
    <div className="grid min-h-[min(62vh,480px)] w-full md:grid-cols-2">
      <div className="relative min-h-[200px] md:min-h-full">
        <SlideMedia slide={slide} ativo={ativo} />
      </div>
      <div
        className="flex flex-col justify-center px-8 py-10 sm:px-12"
        style={{
          background:
            slide.painelGradiente ??
            "linear-gradient(145deg, #1c1917 0%, #292524 100%)",
        }}
      >
        {slide.parceiro && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {slide.parceiro}
          </p>
        )}
        <h2 className="mt-2 text-3xl font-light uppercase tracking-wide text-white sm:text-4xl">
          {slide.titulo}
        </h2>
        {slide.subtitulo && (
          <p className="mt-3 max-w-md text-sm text-white/75">{slide.subtitulo}</p>
        )}
        <CtaButton slide={slide} />
      </div>
    </div>
  );
}

function OverlaySlide({
  slide,
  ativo,
  compact,
}: {
  slide: HomeCarouselSlide;
  ativo: boolean;
  compact: boolean;
}) {
  const minH = compact ? "h-[168px] sm:h-[192px]" : "min-h-[min(62vh,480px)]";

  return (
    <div className={`relative w-full ${minH}`}>
      <SlideMedia slide={slide} ativo={ativo} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div
        className={`absolute inset-x-0 flex flex-col items-center text-center ${
          compact ? "bottom-3 px-3" : "bottom-10 px-6 sm:bottom-14"
        }`}
      >
        {slide.parceiro && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold sm:text-xs">
            {slide.parceiro}
          </p>
        )}
        <h2
          className={`font-semibold text-white ${
            compact ? "text-sm sm:text-base" : "mt-2 text-3xl sm:text-4xl"
          }`}
        >
          {slide.titulo}
        </h2>
        {slide.subtitulo && (
          <p
            className={`text-white/75 ${
              compact ? "mt-0.5 text-[11px] sm:text-xs" : "mt-2 text-sm sm:text-base"
            }`}
          >
            {slide.subtitulo}
          </p>
        )}
        {!compact && <CtaButton slide={slide} />}
      </div>
    </div>
  );
}

function renderSlide(
  slide: HomeCarouselSlide,
  ativo: boolean,
  compact: boolean,
) {
  const layout = slide.layout ?? (temMidia(slide) ? "overlay" : "texto");

  if (layout === "personalizacao" && !compact) {
    return <PersonalizacaoSlide slide={slide} />;
  }
  if (layout === "texto" && !compact) {
    return <TextoSlide slide={slide} />;
  }
  if (layout === "split" && !compact && temMidia(slide)) {
    return <SplitSlide slide={slide} ativo={ativo} />;
  }
  return <OverlaySlide slide={slide} ativo={ativo} compact={compact} />;
}

export function HomeHeroCarousel({
  slides,
  intervalMs = 7_000,
  variant = "hero",
}: Props) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = slides.length;
  const compact = variant === "compact";

  const irPara = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndice(((next % total) + total) % total);
    },
    [total],
  );

  const proximo = useCallback(() => irPara(indice + 1), [irPara, indice]);
  const anterior = useCallback(() => irPara(indice - 1), [irPara, indice]);

  useEffect(() => {
    if (total <= 1 || pausado) return;
    const t = window.setInterval(proximo, intervalMs);
    return () => window.clearInterval(t);
  }, [total, pausado, intervalMs, proximo]);

  if (total === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-zinc-900"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        if (start == null) return;
        const delta = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) > 50) {
          if (delta < 0) proximo();
          else anterior();
        }
        touchStartX.current = null;
      }}
    >
      {slides.map((slide, i) => {
        const ativo = i === indice;
        return (
          <div
            key={slide.id}
            className={`transition-opacity duration-700 ${
              ativo
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0"
            }`}
            aria-hidden={!ativo}
          >
            {renderSlide(slide, ativo, compact)}
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            aria-label="Slide anterior"
            className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 ${
              compact ? "p-1.5" : "hidden p-2.5 sm:block"
            }`}
          >
            <svg width={compact ? 16 : 22} height={compact ? 16 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={proximo}
            aria-label="Próximo slide"
            className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 ${
              compact ? "p-1.5" : "hidden p-2.5 sm:block"
            }`}
          >
            <svg width={compact ? 16 : 22} height={compact ? 16 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div
            className={`absolute left-0 right-0 z-20 flex justify-center gap-1.5 ${
              compact ? "bottom-2" : "bottom-4"
            }`}
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                aria-current={i === indice ? "true" : undefined}
                onClick={() => irPara(i)}
                className={`rounded-full transition-all ${
                  i === indice
                    ? compact
                      ? "h-1.5 w-5 bg-white"
                      : "h-2 w-7 bg-white"
                    : compact
                      ? "h-1.5 w-1.5 bg-white/45"
                      : "h-2 w-2 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
