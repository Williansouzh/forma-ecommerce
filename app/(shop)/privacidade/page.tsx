import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { CONTACT_EMAIL, SITE_LEGAL_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "Quais dados pessoais a loja coleta, para quê, com quem compartilha e como pedir acesso, correção ou exclusão (LGPD).",
  alternates: { canonical: "/privacidade" },
};

/**
 * Política de privacidade (LGPD, Lei 13.709/2018).
 *
 * Escrita a partir do que o sistema faz de fato: o checkout pede nome,
 * e-mail, telefone, CPF e endereço; o orçamento sob medida pede contato e
 * descrição; o pagamento passa pelo Mercado Pago; o aviso de pedido sai pelo
 * WhatsApp. Mudou o que se coleta ou com quem se compartilha, mude aqui.
 */
const sections = [
  {
    title: "O que coletamos",
    text: "Ao finalizar um pedido: nome, e-mail, telefone, CPF e endereço de entrega. Ao pedir um orçamento sob medida: nome, e-mail, telefone e a descrição da peça. O carrinho fica guardado só no seu navegador. Não usamos cookies de publicidade nem rastreamento de terceiros.",
  },
  {
    title: "Para que usamos",
    text: "Para produzir, cobrar e entregar o pedido, emitir a nota fiscal, avisar sobre o andamento pelo WhatsApp e responder a orçamentos. A base legal é a execução do contrato de compra e o cumprimento de obrigações legais e fiscais. Não vendemos nem alugamos seus dados.",
  },
  {
    title: "Com quem compartilhamos",
    text: "Só com quem precisa deles para o pedido acontecer: o Mercado Pago, que processa o pagamento (os dados do cartão são digitados no ambiente dele e nunca passam por nós); a transportadora ou os Correios, que recebem nome e endereço para a entrega; e os provedores que hospedam a loja (Cloudflare e Amazon Web Services).",
  },
  {
    title: "Por quanto tempo guardamos",
    text: "Os dados do pedido ficam guardados pelo prazo que a lei fiscal e o Código de Defesa do Consumidor exigem (em geral, 5 anos). Pedidos de orçamento que não viraram compra são apagados quando você pedir.",
  },
  {
    title: "Seus direitos",
    text: "Você pode pedir, a qualquer momento, para saber quais dados temos sobre você, corrigi-los, levá-los para outro lugar ou apagá-los, quando a lei não nos obrigar a guardá-los (art. 18 da LGPD). Respondemos em até 15 dias.",
  },
  {
    title: "Segurança",
    text: "A loja só funciona por conexão cifrada (HTTPS), o banco de dados não fica exposto à internet e as cópias de segurança são cifradas. O acesso ao painel é restrito a quem administra a loja.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Privacidade" }]}
      />
      <div className="max-w-3xl">
        <p className="text-caption uppercase text-accent">LGPD</p>
        <h1 className="mt-2 font-display text-display-2 tracking-tight">
          Seus dados, sem letra miúda
        </h1>
        <p className="mt-4 text-body-large text-secondary">
          O que a {SITE_LEGAL_NAME} coleta quando você compra ou pede um
          orçamento, para que usa e como pedir que apague.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-lg border border-border-subtle bg-surface p-6"
          >
            <h2 className="font-display text-heading-3">{section.title}</h2>
            <p className="mt-3 text-body-small leading-relaxed text-secondary">
              {section.text}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-lg bg-surface-muted p-6">
        <p className="text-body-small text-secondary">
          Para exercer qualquer um desses direitos, escreva para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent">
            {CONTACT_EMAIL}
          </a>
          . Trocas, prazos e desistência estão nas{" "}
          <Link href="/politicas" className="font-medium text-accent">
            políticas da loja
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
