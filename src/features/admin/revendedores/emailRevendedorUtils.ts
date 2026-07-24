export type EmailAprovacaoRevendedorParams = {
  emailDestino: string;
  nome: string;
  nomeLoja: string;
  loginEmail: string;
  senhaProvisoria: string | null;
  contaExistente: boolean;
  slug: string;
  siteBaseUrl?: string;
};

export type EmailAprovacaoRevendedorConteudo = {
  subject: string;
  text: string;
  html: string;
};

function baseUrl(siteBaseUrl?: string): string {
  if (siteBaseUrl) return siteBaseUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://usezenpro.com.br";
}

export function montarConteudoEmailAprovacaoRevendedor(
  params: EmailAprovacaoRevendedorParams,
): EmailAprovacaoRevendedorConteudo {
  const origin = baseUrl(params.siteBaseUrl);
  const adminUrl = `${origin}/admin/login`;
  const lojaUrl = `${origin}/${params.slug}`;

  const credenciais = params.contaExistente
    ? [
        "ACESSO AO PAINEL",
        `Login: ${params.loginEmail}`,
        "Senha: use a mesma senha que você já utiliza no site Zen Pro.",
        "Se não lembrar, clique em “Esqueci minha senha” na tela de login do admin.",
      ]
    : [
        "ACESSO AO PAINEL",
        `Login: ${params.loginEmail}`,
        `Senha provisória: ${params.senhaProvisoria ?? ""}`,
        "Troque a senha no primeiro acesso.",
      ];

  const guia = [
    "COMO USAR O SISTEMA",
    "",
    "1) Entrar no painel",
    `   Acesse ${adminUrl} e faça login com os dados acima.`,
    "",
    "2) Configurar sua loja",
    "   No menu, abra a edição da loja e configure logo, cor principal e WhatsApp.",
    "   Essas informações aparecem no site público da sua loja.",
    "",
    "3) Divulgar sua URL",
    `   Sua loja online: ${lojaUrl}`,
    "   Compartilhe esse endereço com clientes — eles compram capinhas prontas ou personalizam com foto.",
    "",
    "4) Acompanhar pedidos",
    "   Em Admin → Pedidos você vê todos os pedidos da sua loja, status e detalhes.",
    "   Também é possível registrar venda presencial em Admin → Nova venda.",
    "",
    "5) Catálogo",
    "   Os produtos são do catálogo oficial Zen Pro (cadastrados pela marca).",
    "   Você vende o mesmo catálogo; não precisa cadastrar produtos.",
  ];

  const linhas = [
    `Olá ${params.nome},`,
    "",
    "Sua solicitação para ser revendedor Zen Pro foi APROVADA!",
    "",
    `Loja: ${params.nomeLoja}`,
    `Endereço público: ${lojaUrl}`,
    "",
    ...credenciais,
    "",
    ...guia,
    "",
    "Qualquer dúvida, responda este e-mail.",
    "",
    "Equipe Zen Pro",
  ];

  const text = linhas.join("\n");
  const subject = `Zen Pro — sua loja ${params.nomeLoja} foi aprovada`;

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#18181b;max-width:560px">
      <p>Olá <strong>${params.nome}</strong>,</p>
      <p>Sua solicitação para ser revendedor Zen Pro foi <strong>aprovada</strong>!</p>
      <p><strong>Loja:</strong> ${params.nomeLoja}<br/>
      <strong>Site da loja:</strong> <a href="${lojaUrl}">${lojaUrl}</a></p>
      <h3 style="margin-top:1.5rem">Acesso ao painel</h3>
      <ul>
        <li><strong>Login:</strong> ${params.loginEmail}</li>
        ${
          params.contaExistente
            ? "<li><strong>Senha:</strong> use a mesma senha do site Zen Pro</li>"
            : `<li><strong>Senha provisória:</strong> ${params.senhaProvisoria ?? ""}</li>`
        }
      </ul>
      <p><a href="${adminUrl}">Entrar no admin</a></p>
      <h3 style="margin-top:1.5rem">Como usar o sistema</h3>
      <ol>
        <li>Entre no painel e configure logo, cor e WhatsApp da loja.</li>
        <li>Divulgue sua URL: <a href="${lojaUrl}">${lojaUrl}</a></li>
        <li>Acompanhe pedidos em Admin → Pedidos.</li>
        <li>Registre vendas presenciais em Admin → Nova venda, se precisar.</li>
        <li>O catálogo de produtos é oficial Zen Pro — você só vende.</li>
      </ol>
      <p style="margin-top:2rem;color:#71717a">Equipe Zen Pro</p>
    </div>
  `.trim();

  return { subject, text, html };
}

/** Fallback manual — abre cliente de e-mail local */
export function montarMailtoAprovacaoRevendedor(
  params: EmailAprovacaoRevendedorParams,
): string {
  const { subject, text } = montarConteudoEmailAprovacaoRevendedor(params);
  return `mailto:${encodeURIComponent(params.emailDestino)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export function abrirEmailAprovacaoRevendedor(mailtoUrl: string): void {
  window.location.href = mailtoUrl;
}
