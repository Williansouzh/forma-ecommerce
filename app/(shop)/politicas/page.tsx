import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/breadcrumb";

export const metadata: Metadata = {
  title: "Políticas",
  description:
    "Prazos, trocas, personalização e cuidados para peças FORMA. produzidas por impressão 3D.",
  alternates: { canonical: "/politicas" },
};

const policies = [
  {
    title: "Produção sob demanda",
    text: "A maioria das peças começa a ser produzida após a confirmação do pagamento. O prazo de produção aparece na página do produto e não inclui o tempo de transporte.",
  },
  {
    title: "Trocas e defeitos",
    text: "Trocamos peças com defeito de fabricação comunicado em até 7 dias após o recebimento. Pequenas variações de textura, linhas de camada e tonalidade fazem parte do processo de impressão 3D.",
  },
  {
    title: "Personalizados",
    text: "Pedidos personalizados passam por análise de viabilidade, orçamento e aprovação antes da produção. Alterações depois da aprovação podem mudar prazo e valor.",
  },
  {
    title: "Cuidados com PLA e resina",
    text: "Evite exposição prolongada ao sol, calor excessivo e impacto. Peças decorativas não devem ir à lava-louças, micro-ondas ou forno.",
  },
];

export default function PoliciesPage() {
  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Políticas" }]}
      />
      <div className="max-w-3xl">
        <p className="text-caption uppercase text-accent">Compra segura</p>
        <h1 className="mt-2 font-display text-display-2 tracking-tight">
          Prazos, trocas e cuidados
        </h1>
        <p className="mt-4 text-body-large text-secondary">
          Regras simples para produtos físicos feitos em impressão 3D: o que é
          prazo de produção, o que é variação normal de material e quando a
          troca se aplica.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {policies.map((policy) => (
          <section
            key={policy.title}
            className="rounded-lg border border-border-subtle bg-surface p-6"
          >
            <h2 className="font-display text-heading-3">{policy.title}</h2>
            <p className="mt-3 text-body-small leading-relaxed text-secondary">
              {policy.text}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-lg bg-surface-muted p-6">
        <p className="text-body-small text-secondary">
          Ficou em dúvida sobre material, escala ou prazo?{" "}
          <Link href="/personalizados" className="font-medium text-accent">
            Solicite uma análise personalizada
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
