import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
};

export function ProdutoImagem({
  src,
  alt,
  className = "object-contain p-4",
  sizes = "(max-width: 640px) 45vw, 220px",
}: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
    />
  );
}
