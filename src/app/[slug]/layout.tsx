import { LOJA_SLUGS_STATIC } from "@/features/multitenant/lojaSlugs";
import { LojaLayoutClient } from "./LojaLayoutClient";

export function generateStaticParams() {
  return LOJA_SLUGS_STATIC.map((slug) => ({ slug }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function LojaSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  return <LojaLayoutClient slug={slug}>{children}</LojaLayoutClient>;
}
