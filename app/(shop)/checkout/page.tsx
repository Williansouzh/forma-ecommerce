import { getStoreSettings } from "@/lib/settings";
import { CheckoutClient } from "./checkout-client";

/**
 * O checkout desenha o total com as MESMAS regras que a API vai aplicar:
 * piso do frete grátis e desconto do Pix vêm das configurações do painel.
 */
export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  return (
    <CheckoutClient
      freeShippingThreshold={settings.freeShippingThreshold}
      pixDiscount={settings.pixDiscountPercent / 100}
    />
  );
}
