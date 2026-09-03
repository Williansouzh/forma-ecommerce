"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { useUIStore } from "@/stores/ui-store";
import { submitCustomRequest } from "@/lib/api";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";
import type { CustomType } from "@/types";

const typeOptions: { value: CustomType | ""; label: string }[] = [
  { value: "", label: "Selecione o tipo de peça" },
  { value: "gift", label: "Chaveiro personalizado" },
  { value: "character", label: "Personagem" },
  { value: "gift", label: "Presente" },
  { value: "miniature", label: "Miniatura" },
  { value: "decoration", label: "Decoração" },
  { value: "functional", label: "Peça funcional" },
  { value: "other", label: "Outro" },
];

const gallery = [
  "/images/products/personagem-customizado-01.jpg",
  "/images/products/personagem-customizado-02.jpg",
  "/images/products/personagem-customizado-03.svg",
];

export function PersonalizadosClient() {
  const pushToast = useUIStore((state) => state.pushToast);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<CustomType | "">("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles(Array.from(fileList).map((file) => file.name));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !/.+@.+\..+/.test(email) || !type || !description.trim()) {
      pushToast("Preencha nome, e-mail, tipo e descrição da ideia", "error");
      return;
    }
    try {
      setSubmitting(true);
      await submitCustomRequest({
        customerName: name,
        customerEmail: email,
        description,
        referenceImages: files,
        type,
        budget: budget ? Number(budget.replace(/\D/g, "")) * 100 : undefined,
      });
      setDone(true);
      pushToast("Solicitação enviada! Responderemos em até 2 dias úteis.");
    } catch {
      pushToast("Não foi possível enviar agora. Tente novamente.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 pt-28 md:pt-36">
      <div className="shell">
        <Breadcrumb
          items={[
            { label: "Início", href: "/" },
            { label: "Personalizados" },
          ]}
        />

        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.p variants={fadeUp} className="text-caption uppercase text-accent">
            Sob medida
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-2 font-display text-display-2 tracking-tight"
          >
            Uma peça. Só sua.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-xl text-body-large text-secondary"
          >
            Conte a ideia, envie referências e receba um orçamento em até 2 dias
            úteis. Do modelo 3D à entrega, você aprova cada etapa.
          </motion.p>
        </motion.div>

        <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-5" aria-label="Etapas do processo personalizado">
          {["Ideia", "Modelo 3D", "Material", "Produção", "Entrega"].map(
            (step, index) => (
              <li key={step} className="flex flex-col gap-2">
                <span className="font-display text-heading-2 text-quaternary tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-caption uppercase text-secondary">{step}</span>
              </li>
            )
          )}
        </ol>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-20">
          {done ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-fit flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center"
            >
              <CheckCircle2 size={44} className="text-success" />
              <h2 className="font-display text-heading-2">Solicitação recebida</h2>
              <p className="max-w-sm text-body-small text-secondary">
                Nosso time vai analisar sua ideia e responder no e-mail{" "}
                <span className="font-medium text-primary">{email}</span> em até
                2 dias úteis com o orçamento.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setDone(false);
                  setName("");
                  setEmail("");
                  setType("");
                  setDescription("");
                  setBudget("");
                  setFiles([]);
                }}
              >
                Enviar outra ideia
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="grid max-w-xl gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Input
                  label="Nome"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="flex w-full flex-col gap-1.5">
                <label htmlFor="custom-type" className="text-caption uppercase text-secondary">
                  Tipo de peça
                </label>
                <select
                  id="custom-type"
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as CustomType | "")
                  }
                  required
                  className="h-11 w-full rounded-md border border-strong bg-surface px-4 text-body-small focus:border-accent focus:outline-none"
                >
                  {typeOptions.map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex w-full flex-col gap-1.5">
                <label htmlFor="custom-description" className="text-caption uppercase text-secondary">
                  Descreva sua ideia
                </label>
                <textarea
                  id="custom-description"
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  placeholder="Ex.: um dragão dormindo enrolado em uma torre de livros, cerca de 25 cm, para presente…"
                  className="w-full rounded-md border border-strong bg-surface p-4 text-body-small leading-relaxed placeholder:text-tertiary focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <p className="text-caption uppercase text-secondary">
                  Referências (opcional)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFiles(event.target.files)}
                  className="sr-only"
                  aria-describedby="refs-hint"
                  id="refs-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-strong px-5 text-body-small text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <Paperclip size={15} />
                  Anexar imagens
                </button>
                <p id="refs-hint" className="mt-2 text-caption text-tertiary">
                  {files.length > 0
                    ? files.join(", ")
                    : "Fotos, prints ou sketches ajudam muito no orçamento."}
                </p>
              </div>

              <Input
                label="Orçamento estimado (R$)"
                inputMode="numeric"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Opcional"
                hint="Uma faixa nos ajuda a sugerir escala e material."
              />

              <Button type="submit" size="xl" disabled={submitting} className="justify-self-start">
                {submitting ? "Enviando…" : "Solicitar orçamento"}
                {!submitting && <ArrowRight size={17} />}
              </Button>
            </form>
          )}

          <section aria-labelledby="trabalhos-anteriores">
            <h2 id="trabalhos-anteriores" className="font-display text-heading-2 tracking-tight">
              Já saíram do nosso estúdio
            </h2>
            <p className="mt-2 text-body-small text-secondary">
              Uma amostra de encomendas anteriores aprovadas pelos clientes.
            </p>
            <ul className="mt-6 space-y-4">
              {gallery.map((src, index) => (
                <li key={src}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: 0.4, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                    className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-border-subtle bg-surface-muted"
                  >
                    <Image
                      src={src}
                      alt={`Trabalho personalizado ${index + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </motion.div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
