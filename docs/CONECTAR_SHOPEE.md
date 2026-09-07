# Conectar a loja à Shopee — passo a passo

Este documento leva do zero até o estoque sincronizando. É operacional: o que
clicar, onde, e o que costuma dar errado em cada etapa.

As decisões técnicas por trás disso — mapeamento de status, idempotência,
conciliação — estão em [`SHOPEE.md`](SHOPEE.md). Aqui é só a ligação.

**Tempo:** 15 minutos, depois que os pré-requisitos estiverem prontos. Os
pré-requisitos é que podem levar dias.

---

## Etapa 0 — Pré-requisitos

Dois, e vale conferir os dois antes de abrir o portal da Shopee.

### 0.1 Conta de vendedor Shopee ativa

A Open Platform valida elegibilidade **por região**, e algumas exigem porte,
tipo de negócio ou volume mínimo de pedidos. Loja nova pode não passar. Se for
o seu caso, este é o obstáculo principal e não há nada no código que resolva.

### 0.2 A API acessível por HTTPS público

Este é o que mais trava, e é fácil descobrir tarde demais.

A Shopee precisa **alcançar** o endpoint do webhook. Em desenvolvimento a API
fica em `http://localhost:4001`, que ela não enxerga. Sem resolver isso você
consegue conectar a loja e enviar estoque — essas chamadas saem daqui — mas
**nenhum push chega**, e os pedidos só entram pela varredura periódica, com
até 10 minutos de atraso.

Pior: a URL pública entra na **base da assinatura** do webhook. Se ela não for
idêntica à cadastrada no console da Shopee, toda notificação é recusada.

Para testar sem expor o servidor:

```bash
cloudflared tunnel --url http://localhost:4001
# devolve algo como https://xxxx-yyyy.trycloudflare.com
```

Suba a API com essa URL:

```bash
PUBLIC_API_URL=https://xxxx-yyyy.trycloudflare.com docker compose up -d api
```

> O túnel gratuito muda de endereço a cada execução. Ao reiniciá-lo, atualize
> `PUBLIC_API_URL` **e** a Push URL no console da Shopee — senão a assinatura
> passa a falhar sem aviso.

Para produção, um subdomínio fixo com HTTPS.

---

## Etapa 1 — Conta de desenvolvedor

1. Acesse **<https://open.shopee.com>**
2. **Get Access** e registre-se com a conta de vendedor
3. Escolha o ambiente

São **dois mundos separados, com credenciais diferentes**:

| Ambiente | Sai quando | Serve para |
|---|---|---|
| **Test / Sandbox** | na hora | validar a integração inteira |
| **Live / Production** | após **aprovação da Shopee** | loja de verdade |

**Comece pelo Test.** Dá para percorrer este documento inteiro no sandbox, com
loja e pedidos de mentira, enquanto a aprovação do app Live não sai. A região
`SANDBOX` já está no seletor do nosso painel.

---

## Etapa 2 — Criar o app

**App Management → App List → Create App**

No cadastro, informe as URLs. Duas importam:

| Campo no console | Valor |
|---|---|
| Redirect URL / Callback URL | `https://SEU-DOMINIO/admin/shopee` |
| Push URL / Webhook | `https://SUA-API/api/v1/shopee/webhook` |

> **A Redirect URL tem que bater exatamente.** Nosso painel monta a URL de
> autorização usando a origem da página em que você está: abrindo o painel em
> `http://localhost:3222`, ele envia `http://localhost:3222/admin/shopee`.
> Cadastre no console a origem que você realmente usa. Divergindo em protocolo,
> porta ou barra final, a Shopee recusa o redirect.

Habilite:

- o push de **status de pedido**;
- os escopos de **produto**, **estoque** e **pedido**.

---

## Etapa 3 — Pegar Partner ID e Partner Key

**App Management → App List**, na linha do app:

- **Partner ID** — numérico, público, visível direto
- **Partner Key** — clique no **ícone de olho** para revelar e copiar

São valores **diferentes** no Test e no Live. Copie sem espaço nas pontas: são
sensíveis a maiúsculas, e espaço invisível colado é a causa mais comum de
`error_sign`.

> **A Partner Key é uma senha.** Ela assina toda chamada que sai daqui **e**
> confere a assinatura de todo push que chega. Quem a tiver consegue falar em
> nome da sua loja. Não cole em chat, ticket, e-mail ou commit — ela vai
> direto no painel, que grava no cofre do servidor (`select: false`) e nunca a
> devolve ao navegador: o campo só mostra uma dica mascarada.

---

## Etapa 4 — Configurar no painel

**Painel → Integrações → Shopee**

| Campo | O que colocar |
|---|---|
| Partner ID | da Etapa 3 |
| Partner key | da Etapa 3 — some do campo ao salvar |
| Região | `Sandbox (homologação)` para teste, `Brasil (produção)` depois |

Clique em **Ligar**.

Campo em branco significa "não mexe no que está gravado", não "apaga". Para
trocar uma chave vazada, use **Remover** ao lado do rótulo.

---

## Etapa 5 — Autorizar a loja

**Painel → Shopee → aba Conexão**

1. **Abrir autorização da Shopee** — abre uma aba no portal
2. Faça login como vendedor e autorize o app
3. A Shopee redireciona para
   `/admin/shopee?code=XXXXXXXX&shop_id=999999999`
4. Copie os dois valores **da barra de endereço** e cole em
   **Código de autorização** e **shop_id**
5. **Conectar**

> O `code` vale **uma vez só e por poucos minutos**. Se a troca falhar, volte
> ao passo 1 e refaça — repetir com o mesmo código nunca funciona, e o erro
> não deixa isso claro.

Deu certo quando o cabeçalho passa a mostrar **Conectada**, o `shop_id` e
quanto falta para o token vencer.

O access token dura 4 horas. A renovação daí em diante é automática, com 10
minutos de folga, e você não precisa fazer nada — nem quando ele vencer com o
sistema parado.

---

## Etapa 6 — Associar os produtos

**Painel → Shopee → aba Produtos → Buscar anúncios da Shopee**

A associação é por `item_id`/`model_id`, **nunca por nome**. O painel propõe
comparando SKU e classifica cada proposta:

| Marca | O que significa |
|---|---|
| **SKU exato** | um SKU interno para um anúncio — pode confirmar direto |
| **Ambíguo** | dois ou mais candidatos — **escolha você** |

Nada é aplicado sozinho. Associar errado anuncia o estoque de outra peça, e o
prejuízo aparece como venda de item que não existe.

**Produto com variação precisa de uma associação por variação.** O painel
recusa associar o produto pai — o saldo dele é a soma das variações, e mandar
esse número para um `model_id` anunciaria o estoque das irmãs.

Anúncio sem associação não recebe saldo, e um pedido dele entra no painel
marcado, sem mexer em estoque nenhum.

---

## Etapa 7 — Confirmar a assinatura do push

**Este passo existe por uma incerteza honesta.** A documentação oficial não
estava acessível quando a integração foi escrita (`open.shopee.com` bloqueia
acesso automatizado) e as implementações públicas divergem sobre o formato da
assinatura do push. Os dois esquemas estão implementados e testados; falta
saber qual é o seu.

1. Dispare um push de teste pelo console da Shopee
2. Olhe o log da API:

```bash
docker compose logs -f api | grep -i shopee
```

| O que aparece | O que fazer |
|---|---|
| nada sobre assinatura, e o evento entra | está certo, siga em frente |
| `push com assinatura inválida recusado` | troque o esquema e repita |

Para trocar: **Painel → Shopee → Conexão → Assinatura do webhook**. São duas
opções; se a primeira falhar, é a outra.

> Errar aqui **não corrompe estoque**. O corpo do push nunca decide nada — o
> sistema relê o pedido na API autenticada. O custo de um push recusado é
> latência: a varredura periódica importa o pedido alguns minutos depois.

---

## Etapa 8 — Validar de ponta a ponta

Antes de confiar, faça o circuito completo. No sandbox, sem medo.

- [ ] **Estoque sobe.** Mude o saldo de uma peça associada em
      Produtos → e confira o anúncio na Shopee. Ou force com
      **Shopee → Conexão → Sincronizar tudo**.
- [ ] **Margem funciona.** Ponha margem 2 numa peça com 10 disponíveis; a
      Shopee deve mostrar 8.
- [ ] **Venda no site desconta.** Feche um pedido na loja e veja o saldo cair
      dos dois lados.
- [ ] **Pedido da Shopee entra.** Crie um pedido de teste; ele deve aparecer
      em **Shopee → Pedidos** com código `SHP-…`.
- [ ] **A baixa acontece no pagamento.** Leve o pedido a `READY_TO_SHIP` e
      confira o ledger em Produtos → a peça deve ter saído.
- [ ] **Cancelamento devolve.** Cancele e veja o saldo voltar.
- [ ] **Conciliação está limpa.** **Conferir divergências (simulação)** deve
      terminar sem divergência.

---

## Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `error_sign` em toda chamada | Partner Key com espaço colado, ou relógio do servidor fora de hora | Regrave a chave; sincronize o relógio (NTP) |
| Shopee recusa o redirect | URL do console diferente da origem do painel | Cadastre a origem exata que você usa |
| "Conectada", mas nenhum pedido chega | API sem HTTPS público | Etapa 0.2 |
| Push sempre recusado | Esquema errado, ou `PUBLIC_API_URL` ≠ URL cadastrada | Etapa 7; confira a URL |
| Funcionava e parou depois de reiniciar o túnel | Endereço do túnel mudou | Atualize `PUBLIC_API_URL` e a Push URL |
| Estoque não sobe para uma peça | Associação `pendente` ou `desligada` | Confirme em Shopee → Produtos |
| `invalid_access_token` repetido | Refresh token inválido | Reautorize a loja (Etapa 5) |
| Pedido não importado | Anúncio sem associação | Veja **Shopee → Pedidos → Eventos** — o motivo está lá |

Quando algo falha, **Shopee → Pedidos → Eventos** registra tudo que chegou,
inclusive o que foi ignorado e por quê. E **Shopee → Fila e erros** mostra o
que não conseguiu sair, com o erro e um botão de reprocessar.

---

## Do sandbox para produção

Quando o app Live for aprovado:

1. Pegue o **Partner ID e a Partner Key do ambiente Live** — são outros
2. **Integrações → Shopee**: substitua os dois e mude a região para
   `Brasil (produção)`
3. **Shopee → Conexão → Desconectar**, depois autorize a loja real (Etapa 5)
4. Refaça a Etapa 6: as associações do sandbox apontam para anúncios que não
   existem em produção
5. Rode **Conferir divergências (simulação)** e leia o resultado **antes** de
   deixar corrigir

O checklist completo de produção está em [`SHOPEE.md`](SHOPEE.md#15-checklist-de-produção).

---

## Desligar

Do menos ao mais drástico, e nenhum apaga dado:

1. **Pausar a sincronização** — Shopee → Conexão → desligar *Sincronização
   automática*. Pedidos continuam entrando; o saldo para de subir.
2. **Desligar a integração** — Integrações → Shopee → *Desligar*.
3. **Desconectar a loja** — Shopee → Conexão → *Desconectar*. Apaga os tokens
   do cofre. **As associações são preservadas.**

---

## Segurança — o que nunca fazer

- **Não cole a Partner Key** em chat, ticket, e-mail, commit ou variável de
  ambiente. Ela vai no painel, e só.
- **Não versione credencial.** O `.env.example` tem nomes e explicações, nunca
  valores.
- **Não desligue a verificação de assinatura** para "destravar" o webhook. Sem
  ela, qualquer POST anônimo mexe no seu estoque. Se a assinatura falha, o
  problema é a Etapa 7 ou a URL — não a verificação.
- **Não reutilize a chave do sandbox em produção**, nem o contrário.
