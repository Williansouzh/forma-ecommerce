"use client";

import { useEffect, useState } from "react";
import type { CartItem, PaymentMethod } from "@/types";
import { Input } from "@/components/ui/input";
import { maskCEP, maskPhone, formatPrice } from "@/lib/utils";

export interface CheckoutData {
  email: string;
  firstName: string;
  lastName: string;
  cpf: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const emptyCheckout: CheckoutData = {
  email: "",
  firstName: "",
  lastName: "",
  cpf: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const STORAGE_KEY = "forma-checkout";

function loadSaved(): Partial<CheckoutData> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * As três formas que o Mercado Pago realmente processa. O protótipo desenha
 * "Combinar no WhatsApp" como terceira opção, mas não há nada ligado atrás
 * dela — botão que não faz nada é pior que botão que falta.
 */
const PAYMENTS: { id: PaymentMethod; name: string; note: string }[] = [
  { id: "pix", name: "Pix", note: "5% de desconto" },
  { id: "credit_card", name: "Cartão", note: "até 3× sem juros" },
  { id: "boleto", name: "Boleto", note: "até 3 dias para compensar" },
];

interface FieldErrors {
  [key: string]: string | undefined;
}

/**
 * Uma página, três grupos numerados — a estrutura do handoff.
 *
 * O assistente de três passos que existia aqui escondia o custo do formulário
 * atrás de "Continuar"; numa compra de peça única, ver tudo de uma vez é mais
 * curto. Os dados de cartão saíram: quem cobra é o Mercado Pago, e o campo
 * daqui coletava o número para descartá-lo.
 */
export function CheckoutForm({
  paymentMethod,
  onPaymentMethodChange,
  onComplete,
  total,
  submitting = false,
  submitError = null,
}: {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onComplete: (data: CheckoutData, method: PaymentMethod) => void;
  total: number;
  submitting?: boolean;
  submitError?: string | null;
}) {
  const [data, setData] = useState<CheckoutData>(() => ({
    ...emptyCheckout,
    ...loadSaved(),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const set = (field: keyof CheckoutData) => (value: string) =>
    setData((current) => ({ ...current, [field]: value }));

  /** O desenho pede um campo só; a API quer nome e sobrenome separados. */
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const setFullName = (value: string) => {
    const parts = value.trim().split(/\s+/);
    setData((current) => ({
      ...current,
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    }));
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!data.firstName.trim()) next.fullName = "Obrigatório";
    if (!/.+@.+\..+/.test(data.email)) next.email = "E-mail inválido";
    if (data.phone.replace(/\D/g, "").length < 10)
      next.phone = "WhatsApp incompleto";
    if (data.zipCode.replace(/\D/g, "").length !== 8)
      next.zipCode = "CEP incompleto";
    if (!data.street.trim()) next.street = "Obrigatório";
    if (!data.number.trim()) next.number = "Obrigatório";
    if (!data.neighborhood.trim()) next.neighborhood = "Obrigatório";
    if (!data.city.trim()) next.city = "Obrigatório";
    if (data.state.trim().length !== 2) next.state = "UF com 2 letras";
    return next;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Leva o foco para o primeiro campo com erro, senão o aviso fica fora
      // da tela num formulário desta altura.
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    onComplete(data, paymentMethod);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-[280px] flex-[1_1_min(100%,440px)]"
      noValidate
    >
      <fieldset className="border-0 p-0">
        <legend className="label text-tertiary">01 · Seus dados</legend>
        <div className="mt-4 flex flex-wrap gap-3.5">
          <div className="flex-[1_1_100%]">
            <Input
              label="Nome completo"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={errors.fullName}
            />
          </div>
          <div className="flex-[1_1_220px]">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(event) => set("email")(event.target.value)}
              error={errors.email}
            />
          </div>
          <div className="flex-[1_1_160px]">
            <Input
              label="WhatsApp"
              type="tel"
              autoComplete="tel"
              value={data.phone}
              onChange={(event) => set("phone")(maskPhone(event.target.value))}
              error={errors.phone}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className="label text-tertiary">02 · Entrega</legend>
        <div className="mt-4 flex flex-wrap gap-3.5">
          <div className="flex-[1_1_130px]">
            <Input
              label="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              value={data.zipCode}
              onChange={(event) => set("zipCode")(maskCEP(event.target.value))}
              className="tabular-nums"
              error={errors.zipCode}
            />
          </div>
          <div className="flex-[2_1_220px]">
            <Input
              label="Endereço"
              autoComplete="address-line1"
              value={data.street}
              onChange={(event) => set("street")(event.target.value)}
              error={errors.street}
            />
          </div>
          <div className="flex-[1_1_100px]">
            <Input
              label="Número"
              inputMode="numeric"
              value={data.number}
              onChange={(event) => set("number")(event.target.value)}
              error={errors.number}
            />
          </div>
          <div className="flex-[1_1_140px]">
            <Input
              label="Complemento"
              value={data.complement}
              onChange={(event) => set("complement")(event.target.value)}
            />
          </div>
          {/* Bairro e UF não estão no desenho, mas a etiqueta de envio não
              sai sem eles — e a API rejeita o pedido sem os dois. */}
          <div className="flex-[1_1_160px]">
            <Input
              label="Bairro"
              autoComplete="address-level3"
              value={data.neighborhood}
              onChange={(event) => set("neighborhood")(event.target.value)}
              error={errors.neighborhood}
            />
          </div>
          <div className="flex-[1_1_160px]">
            <Input
              label="Cidade"
              autoComplete="address-level2"
              value={data.city}
              onChange={(event) => set("city")(event.target.value)}
              error={errors.city}
            />
          </div>
          <div className="flex-[0_1_90px]">
            <Input
              label="UF"
              maxLength={2}
              autoComplete="address-level1"
              value={data.state}
              onChange={(event) =>
                set("state")(event.target.value.toUpperCase().slice(0, 2))
              }
              error={errors.state}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className="label text-tertiary">03 · Pagamento</legend>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {PAYMENTS.map((option) => {
            const active = option.id === paymentMethod;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPaymentMethodChange(option.id)}
                aria-pressed={active}
                className={`min-h-14 flex-[1_1_150px] rounded-md border px-4 py-2 text-left transition-colors ${
                  active
                    ? "border-primary bg-surface-muted"
                    : "border-border-strong hover:border-accent"
                }`}
              >
                <span className="block text-[14px] font-semibold">
                  {option.name}
                </span>
                <span className="block text-[12.5px] text-tertiary">
                  {option.note}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {submitError && (
        <p role="alert" className="mt-6 text-body-small text-error">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-7 min-h-14 w-full rounded-md bg-primary text-[14.5px] font-semibold text-background transition-colors duration-300 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Enviando…" : `Confirmar pedido · ${formatPrice(total)}`}
      </button>

      <p className="mt-3.5 text-body-small text-tertiary">
        Peças sob encomenda: a produção começa depois da confirmação do
        pagamento. O cartão é cobrado no Mercado Pago, não aqui.
      </p>
    </form>
  );
}
