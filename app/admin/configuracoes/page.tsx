"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { StoreSettings } from "@/types/settings";

const labelClass =
  "block text-[12px] font-semibold uppercase tracking-[0.12em] text-tertiary";
const fieldClass =
  "mt-1.5 min-h-[42px] w-full rounded-md border border-strong bg-surface px-3 text-body-small font-normal normal-case tracking-normal outline-none transition-colors focus:border-accent";

/** O formulário fala em reais; a API guarda centavos. */
interface Draft {
  freeShippingReais: string;
  pixDiscountPercent: string;
  defaultProductionDays: string;
  atelierName: string;
  atelierCity: string;
  atelierHours: string;
}

function toDraft(settings: StoreSettings): Draft {
  return {
    freeShippingReais: String(Math.round(settings.freeShippingThreshold / 100)),
    pixDiscountPercent: String(settings.pixDiscountPercent),
    defaultProductionDays: String(settings.defaultProductionDays),
    atelierName: settings.atelierName,
    atelierCity: settings.atelierCity,
    atelierHours: settings.atelierHours,
  };
}

export default function AdminSettingsPage() {
  const pushToast = useUIStore((state) => state.pushToast);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((settings) => setDraft(toDraft(settings)))
      .catch((err: Error) => setError(err.message));
  }, []);

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      const saved = await updateSettings({
        freeShippingThreshold: Math.max(
          0,
          Math.round(Number(draft.freeShippingReais) * 100)
        ),
        pixDiscountPercent: Number(draft.pixDiscountPercent),
        defaultProductionDays: Number(draft.defaultProductionDays),
        atelierName: draft.atelierName.trim(),
        atelierCity: draft.atelierCity.trim(),
        atelierHours: draft.atelierHours.trim(),
      });
      setDraft(toDraft(saved));
      pushToast("Configurações salvas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Configurações da loja
      </h1>
      <p className="mt-2 max-w-[620px] text-tertiary">
        Valem para a loja inteira. Se a API estiver fora do ar, o site continua
        com os valores padrão em <code>lib/constants.ts</code>.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
        >
          {error}
        </p>
      )}

      {!draft ? (
        <p className="mt-7 text-body-small text-tertiary">
          Carregando configurações…
        </p>
      ) : (
        <>
          <div className="mt-7 flex flex-wrap gap-5">
            <section className="min-w-0 flex-1 basis-[min(100%,340px)] border border-border-subtle bg-surface p-[22px]">
              <h2 className="mb-[18px] font-display text-[21px]">Venda</h2>

              <label className={labelClass}>
                Frete grátis a partir de (R$)
                <input
                  type="number"
                  step={10}
                  min={0}
                  value={draft.freeShippingReais}
                  onChange={(event) =>
                    set("freeShippingReais", event.target.value)
                  }
                  className={cn(fieldClass, "tabular-nums")}
                />
              </label>

              <label className={cn(labelClass, "mt-4")}>
                Desconto no Pix (%)
                <input
                  type="number"
                  step={1}
                  min={0}
                  max={50}
                  value={draft.pixDiscountPercent}
                  onChange={(event) =>
                    set("pixDiscountPercent", event.target.value)
                  }
                  className={cn(fieldClass, "tabular-nums")}
                />
              </label>

              <label className={cn(labelClass, "mt-4")}>
                Prazo padrão de produção (dias úteis)
                <input
                  type="number"
                  step={1}
                  min={1}
                  value={draft.defaultProductionDays}
                  onChange={(event) =>
                    set("defaultProductionDays", event.target.value)
                  }
                  className={cn(fieldClass, "tabular-nums")}
                />
              </label>
            </section>

            <section className="min-w-0 flex-1 basis-[min(100%,340px)] border border-border-subtle bg-surface p-[22px]">
              <h2 className="mb-[18px] font-display text-[21px]">Ateliê</h2>

              <label className={labelClass}>
                Nome público
                <input
                  value={draft.atelierName}
                  onChange={(event) => set("atelierName", event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "mt-4")}>
                Cidade de origem
                <input
                  value={draft.atelierCity}
                  onChange={(event) => set("atelierCity", event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "mt-4")}>
                Horário de atendimento
                <input
                  value={draft.atelierHours}
                  onChange={(event) => set("atelierHours", event.target.value)}
                  className={fieldClass}
                />
              </label>
            </section>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-[22px] min-h-[48px] rounded-md bg-primary px-6 font-semibold text-background transition-colors duration-300 hover:bg-accent disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
        </>
      )}
    </div>
  );
}
