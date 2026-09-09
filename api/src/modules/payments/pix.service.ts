import { Injectable } from "@nestjs/common";

/**
 * O "Pix copia e cola" da loja, gerado aqui mesmo.
 *
 * Sem Mercado Pago configurado, o pedido acabava numa tela que dizia o código
 * e mais nada: o cliente fechava a compra e não tinha como pagar. Mostrar só a
 * chave resolveria pela metade — quem paga ainda teria de digitar o valor, e
 * valor digitado errado vira conferência manual no extrato.
 *
 * O BR Code embute chave, valor e identificação num texto só. É o padrão
 * EMV®/BACEN (Manual de Padrões para Iniciação do Pix), montado por
 * concatenação de campos e fechado com um CRC — nenhuma chamada de rede,
 * nenhuma dependência, nenhum intermediário. O dinheiro cai direto na conta
 * da loja.
 *
 * O que este serviço NÃO faz: confirmar pagamento. Pix direto não tem webhook;
 * quem confere o comprovante é uma pessoa, e é por isso que a tela de
 * confirmação manda o cliente enviar o comprovante pelo WhatsApp.
 */

export interface PixChargeInput {
  /** Em centavos, como o resto do domínio. */
  amount: number;
  /** Identificador da cobrança (txid). Alfanumérico, até 25 caracteres. */
  txid: string;
  /** A chave Pix DA LOJA. */
  key: string;
  /** Nome que o app do banco mostra como favorecido. */
  receiverName: string;
  /** Cidade do recebedor — o padrão exige, o app mostra. */
  city: string;
}

export interface PixCharge {
  /** O texto do "copia e cola", com o valor já embutido. */
  brcode: string;
  key: string;
  receiverName: string;
}

@Injectable()
export class PixService {
  buildCharge({
    amount,
    txid,
    key,
    receiverName,
    city,
  }: PixChargeInput): PixCharge {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("O valor da cobrança Pix deve ser positivo e em centavos.");
    }

    const pixKey = key.trim();
    if (!pixKey || pixKey.length > 77) {
      throw new Error("A chave Pix deve ter entre 1 e 77 caracteres.");
    }

    const name = sanitize(receiverName, 25);
    const merchantCity = sanitize(city, 15);
    if (!name || !merchantCity) {
      throw new Error("Nome e cidade do recebedor Pix são obrigatórios.");
    }

    const value = (amount / 100).toFixed(2);
    if (value.length > 13) {
      throw new Error("O valor da cobrança excede o limite do BR Code Pix.");
    }

    const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", pixKey);

    const payload =
      tlv("00", "01") + //            formato do payload
      tlv("01", "12") + //            12 = uso único: o valor está fixo abaixo
      tlv("26", merchantAccount) + // domínio do Pix + chave
      tlv("52", "0000") + //          categoria do estabelecimento
      tlv("53", "986") + //           moeda: BRL
      tlv("54", value) + //           valor
      tlv("58", "BR") + //            país
      tlv("59", name) + //            favorecido
      tlv("60", merchantCity) + //    cidade
      tlv("62", tlv("05", sanitizeTxid(txid)));

    // O CRC é calculado sobre o payload JÁ COM o marcador "6304" no fim —
    // exigência do padrão, e o erro mais fácil de cometer aqui.
    const withCrcMarker = `${payload}6304`;

    return {
      brcode: `${withCrcMarker}${crc16(withCrcMarker)}`,
      key: pixKey,
      receiverName: name,
    };
  }
}

/** Um campo EMV: identificador (2) + tamanho (2) + valor. */
function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

/**
 * Tira acento e símbolo e corta no tamanho.
 *
 * Não é preciosismo: o payload é ASCII, e o tamanho declarado no campo é
 * contado em caracteres. Um "ã" que passe direto desalinha a leitura do
 * campo seguinte e o app do banco recusa o código inteiro.
 */
function sanitize(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max);
}

/** `***` é o que o padrão manda usar quando não há identificação. */
function sanitizeTxid(value: string): string {
  const clean = value.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return clean.length > 0 ? clean : "***";
}

/** CRC16-CCITT (início 0xFFFF, polinômio 0x1021), como o BR Code exige. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
