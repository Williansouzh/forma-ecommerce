"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CreditCard, QrCode, Barcode, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CartItem, PaymentMethod } from "@/types";
import {
  maskCEP,
  maskCPF,
  maskCard,
  maskExpiry,
  maskPhone,
  cn,
} from "@/lib/utils";

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
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
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
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvv: "",
};

const STEPS = [
  { id: "info", label: "Informações" },
  { id: "delivery", label: "Entrega" },
  { id: "payment", label: "Pagamento" },
] as const;

const STORAGE_KEY = "forma-checkout";

function loadSaved(): Partial<CheckoutData> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

interface FieldErrors {
  [key: string]: string | undefined;
}

const paymentOptions: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "pix", label: "Pix", description: "Aprovação imediata · 5% de desconto", icon: QrCode },
  { id: "credit_card", label: "Cartão de crédito", description: "Em até 12x", icon: CreditCard },
  { id: "boleto", label: "Boleto bancário", description: "Até 3 dias úteis para compensar", icon: Barcode },
];

export function CheckoutForm({
  items,
  paymentMethod,
  onPaymentMethodChange,
  onComplete,
}: {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onComplete: (data: CheckoutData, method: PaymentMethod) => void;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CheckoutData>(() => ({
    ...emptyCheckout,
    ...loadSaved(),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const payment = paymentMethod;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const set = (field: keyof CheckoutData) => (value: string) =>
    setData((current) => ({ ...current, [field]: value }));

  const validateInfo = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!/.+@.+\..+/.test(data.email)) next.email = "E-mail inválido";
    if (!data.firstName.trim()) next.firstName = "Obrigatório";
    if (!data.lastName.trim()) next.lastName = "Obrigatório";
    if (data.cpf.replace(/\D/g, "").length !== 11) next.cpf = "CPF incompleto";
    if (data.phone.replace(/\D/g, "").length < 10)
      next.phone = "Telefone incompleto";
    return next;
  };

  const validateDelivery = (): FieldErrors => {
    const next: FieldErrors = {};
    if (data.zipCode.replace(/\D/g, "").length !== 8)
      next.zipCode = "CEP incompleto";
    if (!data.street.trim()) next.street = "Obrigatório";
    if (!data.number.trim()) next.number = "Obrigatório";
    if (!data.neighborhood.trim()) next.neighborhood = "Obrigatório";
    if (!data.city.trim()) next.city = "Obrigatório";
    if (!data.state.trim() || data.state.length !== 2)
      next.state = "UF com 2 letras";
    return next;
  };

  const validatePayment = (): FieldErrors => {
    const next: FieldErrors = {};
    if (payment === "credit_card") {
      if (data.cardNumber.replace(/\D/g, "").length !== 16)
        next.cardNumber = "Número do cartão incompleto";
      if (!data.cardName.trim()) next.cardName = "Obrigatório";
      if (data.cardExpiry.length < 5) next.cardExpiry = "Validade incompleta";
      if (data.cardCvv.length < 3) next.cardCvv = "CVV incompleto";
    }
    return next;
  };

  const validations = [validateInfo, validateDelivery, validatePayment];

  const next = () => {
    const found = validations[step]();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep((current) => Math.min(current + 1, 2));
  };

  const back = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = () => {
    const found = validatePayment();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onComplete(data, payment);
  };

  return (
    <div>
      <ol
        aria-label="Progresso do checkout"
        className="flex items-center gap-3"
      >
        {STEPS.map((stepDef, index) => (
          <li key={stepDef.id} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                index < step &&
                (setStep(index), setErrors({}))
              }
              disabled={index >= step}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-body-small font-medium transition-colors",
                index < step && "bg-success text-white",
                index === step && "bg-primary text-background",
                index > step &&
                  "border border-strong text-tertiary",
                index < step && "cursor-pointer hover:bg-success/90"
              )}
            >
              {index < step ? <CheckCircle2 size={16} /> : index + 1}
            </button>
            <span
              className={cn(
                "hidden text-caption uppercase sm:block",
                index === step ? "text-primary" : "text-tertiary"
              )}
            >
              {stepDef.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border-subtle">
                <motion.span
                  initial={false}
                  animate={{ scaleX: index < step ? 1 : 0 }}
                  style={{ originX: 0 }}
                  transition={{ duration: 0.4 }}
                  className="block h-full bg-accent"
                />
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {step === 0 && (
              <fieldset className="grid max-w-xl gap-5">
                <legend className="sr-only">Informações pessoais</legend>
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={data.email}
                  onChange={(event) => set("email")(event.target.value)}
                  error={errors.email}
                  placeholder="voce@email.com"
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Nome"
                    autoComplete="given-name"
                    value={data.firstName}
                    onChange={(event) => set("firstName")(event.target.value)}
                    error={errors.firstName}
                  />
                  <Input
                    label="Sobrenome"
                    autoComplete="family-name"
                    value={data.lastName}
                    onChange={(event) => set("lastName")(event.target.value)}
                    error={errors.lastName}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="CPF"
                    inputMode="numeric"
                    value={data.cpf}
                    onChange={(event) => set("cpf")(maskCPF(event.target.value))}
                    className="font-mono"
                    error={errors.cpf}
                    placeholder="000.000.000-00"
                  />
                  <Input
                    label="Telefone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(event) =>
                      set("phone")(maskPhone(event.target.value))
                    }
                    className="font-mono"
                    error={errors.phone}
                    placeholder="(11) 90000-0000"
                  />
                </div>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="grid max-w-xl gap-5">
                <legend className="sr-only">Endereço de entrega</legend>
                <Input
                  label="CEP"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={data.zipCode}
                  onChange={(event) => set("zipCode")(maskCEP(event.target.value))}
                  className="font-mono"
                  error={errors.zipCode}
                  hint="O endereço é preenchido automaticamente pelo CEP em breve"
                  placeholder="00000-000"
                />
                <div className="grid grid-cols-[1fr_100px] gap-5">
                  <Input
                    label="Rua"
                    autoComplete="address-line1"
                    value={data.street}
                    onChange={(event) => set("street")(event.target.value)}
                    error={errors.street}
                  />
                  <Input
                    label="Número"
                    inputMode="numeric"
                    value={data.number}
                    onChange={(event) => set("number")(event.target.value)}
                    error={errors.number}
                  />
                </div>
                <Input
                  label="Complemento"
                  value={data.complement}
                  onChange={(event) => set("complement")(event.target.value)}
                  placeholder="Opcional"
                />
                <div className="grid gap-5 sm:grid-cols-3">
                  <Input
                    label="Bairro"
                    value={data.neighborhood}
                    onChange={(event) =>
                      set("neighborhood")(event.target.value)
                    }
                    error={errors.neighborhood}
                  />
                  <Input
                    label="Cidade"
                    autoComplete="address-level2"
                    value={data.city}
                    onChange={(event) => set("city")(event.target.value)}
                    error={errors.city}
                  />
                  <Input
                    label="UF"
                    maxLength={2}
                    value={data.state}
                    onChange={(event) =>
                      set("state")(event.target.value.toUpperCase())
                    }
                    error={errors.state}
                    placeholder="SP"
                  />
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="max-w-xl">
                <legend className="text-caption uppercase text-secondary">
                  Forma de pagamento
                </legend>
                <div className="mt-3 space-y-3">
                  {paymentOptions.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors",
                        payment === option.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-strong hover:border-primary/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={option.id}
                        checked={payment === option.id}
                        onChange={() => onPaymentMethodChange(option.id)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-md",
                          payment === option.id
                            ? "bg-accent text-white"
                            : "bg-surface-muted text-secondary"
                        )}
                      >
                        <option.icon size={20} />
                      </span>
                      <span>
                        <span className="block text-body-small font-medium">
                          {option.label}
                        </span>
                        <span className="block text-caption text-tertiary">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <AnimatePresence>
                  {payment === "credit_card" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-5 pt-6">
                        <Input
                          label="Número do cartão"
                          inputMode="numeric"
                          value={data.cardNumber}
                          onChange={(event) =>
                            set("cardNumber")(maskCard(event.target.value))
                          }
                            className="font-mono"
                          error={errors.cardNumber}
                          placeholder="0000 0000 0000 0000"
                        />
                        <Input
                          label="Nome no cartão"
                          value={data.cardName}
                          onChange={(event) =>
                            set("cardName")(event.target.value.toUpperCase())
                          }
                          error={errors.cardName}
                        />
                        <div className="grid grid-cols-2 gap-5">
                          <Input
                            label="Validade"
                            inputMode="numeric"
                            value={data.cardExpiry}
                            onChange={(event) =>
                              set("cardExpiry")(maskExpiry(event.target.value))
                            }
                            className="font-mono"
                            error={errors.cardExpiry}
                            placeholder="MM/AA"
                          />
                          <Input
                            label="CVV"
                            inputMode="numeric"
                            maxLength={4}
                            value={data.cardCvv}
                            onChange={(event) =>
                              set("cardCvv")(
                                event.target.value.replace(/\D/g, "")
                              )
                            }
                            className="font-mono"
                            error={errors.cardCvv}
                            placeholder="000"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="mt-6 flex items-center gap-2 text-caption text-tertiary">
                  <Lock size={13} />
                  Ambiente seguro — dados protegidos e criptografados
                </p>
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="inline-flex h-13 items-center rounded-md border border-strong px-8 py-3.5 text-body font-medium transition-colors hover:bg-surface-muted"
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          onClick={step === 2 ? submit : next}
          disabled={items.length === 0}
          className="inline-flex h-13 items-center justify-center rounded-md bg-accent px-10 py-3.5 text-body font-medium text-white transition-all hover:-translate-y-px hover:bg-accent-dark active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {step === 2 ? "Confirmar pedido" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
