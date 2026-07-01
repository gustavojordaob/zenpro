import Link from "next/link";

type Props = {
  href?: string;
  label?: string;
};

export function PageBackLink({ href = "/", label = "← Voltar à loja" }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}
