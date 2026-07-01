const PASSOS = [
  {
    numero: "1",
    titulo: "Escolha o modelo",
    descricao: "Selecione a capinha compatível com o seu celular na vitrine.",
  },
  {
    numero: "2",
    titulo: "Suba a sua foto",
    descricao: "Envie a imagem e ajuste posição, zoom e rotação no preview.",
  },
  {
    numero: "3",
    titulo: "Receba em casa",
    descricao: "Finalizamos a produção e enviamos a capinha personalizada até você.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-t border-zinc-200 bg-white py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Como funciona
          </h2>
          <p className="mt-2 text-zinc-600">
            Três passos simples — tudo no navegador, sem app.
          </p>
        </div>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {PASSOS.map((passo) => (
            <li
              key={passo.numero}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                {passo.numero}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                {passo.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {passo.descricao}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
