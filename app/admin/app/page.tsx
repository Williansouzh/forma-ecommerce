"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createAppPairing, SessaoExpirada } from "@/lib/admin-api";
import { APP_DOWNLOAD_URL } from "@/lib/app-download";
import { SITE_LEGAL_NAME } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface Pairing {
  qr: string;
  expiresAt: number;
}

/**
 * O conteúdo do QR, lido pelo app Minhas Lojas. `url` é o domínio aberto
 * agora: é por ele que o app entra, com o mesmo repasse do painel.
 */
function pairingUri(code: string): string {
  const params = new URLSearchParams({
    v: "1",
    kind: "forma",
    name: SITE_LEGAL_NAME,
    url: window.location.origin,
    code,
  });
  return `minhaslojas://pair?${params}`;
}

const sectionClass =
  "min-w-0 flex-1 basis-[min(100%,340px)] border border-border-subtle bg-surface p-[22px]";

export default function AppMovelPage() {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [downloadQr, setDownloadQr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = pairing ? Math.max(0, Math.ceil((pairing.expiresAt - now) / 1000)) : 0;
  const expired = pairing !== null && remaining === 0;

  useEffect(() => {
    QRCode.toDataURL(APP_DOWNLOAD_URL, { width: 280, margin: 1 }).then(setDownloadQr, () => {});
  }, []);

  useEffect(() => {
    if (!pairing || expired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pairing, expired]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { code, expiresAt } = await createAppPairing();
      const qr = await QRCode.toDataURL(pairingUri(code), {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setNow(Date.now());
      setPairing({ qr, expiresAt: Date.parse(expiresAt) });
    } catch (err) {
      if (err instanceof SessaoExpirada) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível gerar o QR code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        App móvel
      </h1>
      <p className="mt-1.5 max-w-[620px] text-tertiary">
        Pedidos e produtos no celular, com foto direto da câmera.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-5">
        <section className={sectionClass}>
          <h2 className="font-display text-heading-3">Entrar com QR code</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-body-small text-secondary">
            <li>Abra o app Minhas Lojas no celular.</li>
            <li>
              Toque em <strong>Escanear QR code</strong>.
            </li>
            <li>Aponte a câmera para o código abaixo.</li>
          </ol>

          <div className="mt-6 flex flex-col items-center gap-4">
            {pairing && !expired ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada aqui */}
                <img src={pairing.qr} alt="QR code para entrar no app" width={240} height={240} />
                <p className="text-body-small text-tertiary">
                  Vale por {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}, uma
                  única vez.
                </p>
              </>
            ) : (
              <div className="grid size-[240px] place-items-center border border-dashed border-border-strong text-center text-body-small text-tertiary">
                {expired ? "O código expirou." : "O código aparece aqui."}
              </div>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="rounded-md border border-primary bg-primary px-6 py-3 label text-background transition-all hover:bg-transparent hover:text-primary disabled:opacity-60"
            >
              {loading ? "Gerando…" : pairing ? "Gerar outro código" : "Gerar QR code"}
            </button>
          </div>

          <p className="mt-6 text-caption text-tertiary">
            Quem ler este código entra no painel com a sua conta. Não compartilhe nem mostre em fotos.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="font-display text-heading-3">Baixar o app</h2>
          <p className="mt-3 text-body-small text-secondary">
            Para Android. Leia o código com a câmera do celular ou use o botão.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            {downloadQr && (
              /* eslint-disable-next-line @next/next/no-img-element -- data URL gerada aqui */
              <img src={downloadQr} alt="QR code para baixar o app" width={200} height={200} />
            )}
            <a
              href={APP_DOWNLOAD_URL}
              className="rounded-md border border-primary px-6 py-3 label text-primary transition-colors hover:bg-primary hover:text-background"
            >
              Baixar para Android
            </a>
          </div>
          <p className="mt-6 text-caption text-tertiary">
            Na instalação, o Android pode pedir para permitir apps de fontes desconhecidas.
          </p>
        </section>
      </div>
    </div>
  );
}
