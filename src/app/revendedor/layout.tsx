import { RevendedorLayoutClient } from "./RevendedorLayoutClient";

export default function RevendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RevendedorLayoutClient>{children}</RevendedorLayoutClient>;
}
