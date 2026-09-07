"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { getSettings, updateSettings } from "@/lib/admin-api";
import {
  ImageUploadButton,
  StorageNotice,
  useMediaStatus,
} from "@/components/admin/image-upload";
import {
  HOME_SLOTS,
  resolveHomeMedia,
  type HomeSlotId,
} from "@/lib/home-media";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { MediaStatus } from "@/types/media";
import type { HomeImage, HomeMedia, LookbookImage } from "@/types/settings";

const labelClass =
  "block text-[12px] font-semibold uppercase tracking-[0.12em] text-tertiary";
const fieldClass =
  "mt-1.5 min-h-[42px] w-full rounded-md border border-strong bg-surface px-3 text-body-small font-normal normal-case tracking-normal outline-none transition-colors focus:border-accent";
const sectionClass =
  "mt-5 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]";

/** Um slot é "padrão" enquanto ninguém trocou a foto dele. */
function isDefault(value: HomeImage | undefined): boolean {
  return !value?.url?.trim();
}

export default function AdminHomePage() {
  const pushToast = useUIStore((state) => state.pushToast);
  const [media, setMedia] = useState<HomeMedia>({});
  const storage = useMediaStatus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getSettings();
        setMedia(settings.homeMedia ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao ler os ajustes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Grava o conjunto inteiro de imagens.
   *
   * Manda `homeMedia` completo em vez de um campo por vez porque o PATCH faz
   * `$set` no objeto: mandar só um slot apagaria os outros. A alternativa
   * seria uma rota por slot, e não vale o contrato extra.
   */
  const save = useCallback(
    async (next: HomeMedia, key: string, message: string) => {
      setBusy(key);
      setError(null);
      const previous = media;
      setMedia(next);
      try {
        const saved = await updateSettings({ homeMedia: next });
        setMedia(saved.homeMedia ?? {});
        pushToast(message);
      } catch (err) {
        setMedia(previous);
        const text = err instanceof Error ? err.message : "Falha ao salvar";
        setError(text);
        pushToast(text, "error");
      } finally {
        setBusy(null);
      }
    },
    [media, pushToast],
  );

  const resolved = resolveHomeMedia(media);

  if (loading) {
    return (
      <div className="animate-fade-up">
        <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
          Imagens da vitrine
        </h1>
        <p className="mt-7 text-body-small text-tertiary">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Imagens da vitrine
      </h1>
      <p className="mt-1.5 max-w-[640px] text-tertiary">
        As fotos da página inicial e do ateliê. Slot sem troca usa a imagem que
        já vem com a loja — remover uma troca devolve a original, não deixa
        buraco.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      )}

      <div className="mt-6">
        <StorageNotice media={storage} />
      </div>

      {HOME_SLOTS.map((slot) => (
        <ImageSlot
          key={slot.id}
          name={slot.name}
          hint={slot.hint}
          value={resolved[slot.id]}
          usingDefault={isDefault(media[slot.id])}
          storage={storage}
          busy={busy === slot.id}
          disabled={busy !== null}
          onChange={(image) =>
            void save(
              { ...media, [slot.id]: image },
              slot.id,
              `${slot.name}: imagem atualizada`,
            )
          }
          onReset={() => {
            const next = { ...media };
            delete next[slot.id as HomeSlotId];
            void save(next, slot.id, `${slot.name}: voltou para a imagem original`);
          }}
        />
      ))}

      <section className={sectionClass}>
        <h2 className="font-display text-2xl">Lookbook</h2>
        <p className="mt-2 max-w-[620px] text-sm text-secondary">
          As seis fotos de &ldquo;onde as peças moram&rdquo;, com o cômodo e o
          bairro escritos sobre elas. A tira rola em laço, então as seis
          posições sempre existem.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.lookbook.map((photo, index) => (
            <LookbookSlot
              key={index}
              index={index}
              photo={photo}
              usingDefault={isDefault(media.lookbook?.[index])}
              storage={storage}
              busy={busy === `lookbook-${index}`}
              disabled={busy !== null}
              onChange={(next) => {
                const list = [...(media.lookbook ?? [])];
                while (list.length < 6) {
                  list.push({ url: "", alt: "", room: "", place: "" });
                }
                list[index] = next;
                void save(
                  { ...media, lookbook: list },
                  `lookbook-${index}`,
                  `Lookbook ${index + 1}: atualizado`,
                );
              }}
              onReset={() => {
                const list = [...(media.lookbook ?? [])];
                while (list.length < 6) {
                  list.push({ url: "", alt: "", room: "", place: "" });
                }
                list[index] = { url: "", alt: "", room: "", place: "" };
                void save(
                  { ...media, lookbook: list },
                  `lookbook-${index}`,
                  `Lookbook ${index + 1}: voltou para a foto original`,
                );
              }}
            />
          ))}
        </div>
      </section>

      <p className="mt-6 text-[13px] text-tertiary">
        As páginas da loja são servidas sob demanda, então a troca aparece no
        próximo carregamento — sem republicar nada.
      </p>
    </div>
  );
}

// ── Peças ──────────────────────────────────────────────────────────────────

function Preview({ image }: { image: HomeImage }) {
  return (
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-muted sm:w-[180px]">
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="180px"
        className="object-cover"
        // A prévia pode apontar para um bucket recém-configurado; falhar aqui
        // não pode derrubar a tela de administração.
        unoptimized
      />
    </div>
  );
}

function ResetLink({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tertiary transition-colors hover:text-error disabled:opacity-40"
    >
      Voltar à original
    </button>
  );
}

function ImageSlot({
  name,
  hint,
  value,
  usingDefault,
  storage,
  busy,
  disabled,
  onChange,
  onReset,
}: {
  name: string;
  hint: string;
  value: HomeImage;
  usingDefault: boolean;
  storage: MediaStatus | null;
  busy: boolean;
  disabled: boolean;
  onChange: (image: HomeImage) => void;
  onReset: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="font-display text-2xl">{name}</h2>
        {usingDefault ? (
          <span className="bg-surface-muted px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.13em] text-tertiary">
            Original
          </span>
        ) : (
          <ResetLink onClick={onReset} disabled={disabled} />
        )}
      </div>
      <p className="mt-2 text-sm text-secondary">{hint}</p>

      {message && (
        <p role="alert" className="mt-3 rounded-md bg-error/10 px-3 py-2 text-micro text-error">
          {message}
        </p>
      )}

      <div className="mt-[18px] flex flex-col gap-4 sm:flex-row">
        <Preview image={value} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2.5">
            <label className={cn(labelClass, "min-w-0 flex-1 basis-[240px]")}>
              Caminho ou URL da imagem
              <input
                value={value.url}
                onChange={(event) => onChange({ url: event.target.value, alt: value.alt })}
                placeholder="/images/products/…"
                className={fieldClass}
              />
            </label>
            <ImageUploadButton
              media={storage}
              disabled={disabled || busy}
              label={`Enviar arquivo para ${name}`}
              onError={setMessage}
              onUploaded={(url: string) => {
                setMessage(null);
                onChange({ url, alt: value.alt });
              }}
            />
          </div>

          <label className={labelClass}>
            Descrição da imagem
            <input
              value={value.alt}
              onChange={(event) => onChange({ url: value.url, alt: event.target.value })}
              placeholder="O que aparece na foto"
              className={fieldClass}
            />
            <span className="mt-1 block text-[11.5px] font-normal normal-case tracking-normal text-tertiary">
              É o que leitores de tela leem, e o que aparece se a imagem não
              carregar.
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}

function LookbookSlot({
  index,
  photo,
  usingDefault,
  storage,
  busy,
  disabled,
  onChange,
  onReset,
}: {
  index: number;
  photo: LookbookImage;
  usingDefault: boolean;
  storage: MediaStatus | null;
  busy: boolean;
  disabled: boolean;
  onChange: (photo: LookbookImage) => void;
  onReset: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 border border-border-subtle p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-tertiary">
          Foto {index + 1}
        </span>
        {usingDefault ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-tertiary">
            Original
          </span>
        ) : (
          <ResetLink onClick={onReset} disabled={disabled} />
        )}
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-border-subtle bg-surface-muted">
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="(max-width: 640px) 100vw, 240px"
          className="object-cover"
          unoptimized
        />
      </div>

      {message && (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-micro text-error">
          {message}
        </p>
      )}

      <div className="flex items-end gap-2">
        <label className={cn(labelClass, "min-w-0 flex-1")}>
          Imagem
          <input
            value={photo.url}
            onChange={(event) => onChange({ ...photo, url: event.target.value })}
            className={fieldClass}
          />
        </label>
        <ImageUploadButton
          media={storage}
          size="compact"
          disabled={disabled || busy}
          label={`Enviar arquivo para a foto ${index + 1} do lookbook`}
          onError={setMessage}
          onUploaded={(url: string) => {
            setMessage(null);
            onChange({ ...photo, url });
          }}
        />
      </div>

      <label className={labelClass}>
        Descrição
        <input
          value={photo.alt}
          onChange={(event) => onChange({ ...photo, alt: event.target.value })}
          className={fieldClass}
        />
      </label>

      <div className="flex gap-2">
        <label className={cn(labelClass, "min-w-0 flex-1")}>
          Cômodo
          <input
            value={photo.room}
            onChange={(event) => onChange({ ...photo, room: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className={cn(labelClass, "min-w-0 flex-1")}>
          Bairro
          <input
            value={photo.place}
            onChange={(event) => onChange({ ...photo, place: event.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}
