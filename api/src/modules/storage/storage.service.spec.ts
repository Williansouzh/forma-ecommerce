import { publicUrlProblem } from "./storage.service";

/**
 * A base pública é o campo mais fácil de errar da integração, e errar nele
 * falha TARDE: o upload funciona, o objeto é gravado, e só o navegador de quem
 * visita a loja descobre que aquele endereço não serve.
 */
describe("publicUrlProblem", () => {
  it("aceita a Public Development URL do bucket", () => {
    expect(
      publicUrlProblem("https://pub-c58ebc5386d04de2857b4c4835024950.r2.dev"),
    ).toBeNull();
  });

  it("aceita domínio personalizado", () => {
    expect(publicUrlProblem("https://img.seudominio.com")).toBeNull();
  });

  /**
   * O erro que aconteceu de verdade. O painel da Cloudflare mostra este
   * endereço em destaque, rotulado "S3 API", com botão de copiar — logo acima
   * da URL de leitura. Ele exige assinatura em toda requisição, então a imagem
   * sobe e nunca aparece.
   */
  it("recusa o endpoint da API S3, dizendo onde achar o certo", () => {
    const problem = publicUrlProblem(
      "https://6ae929271eb17ade3079950872411a50.r2.cloudflarestorage.com/forma-data",
    );

    expect(problem).toMatch(/endpoint da API S3/);
    expect(problem).toMatch(/pub-…\.r2\.dev/);
    expect(problem).toMatch(/Settings/);
  });

  it("recusa o endpoint S3 com jurisdição", () => {
    expect(
      publicUrlProblem("https://conta.eu.r2.cloudflarestorage.com/forma-data"),
    ).toMatch(/endpoint da API S3/);
  });

  it("recusa a URL do painel da Cloudflare", () => {
    expect(
      publicUrlProblem("https://dash.cloudflare.com/abc/r2/default/buckets/forma-data"),
    ).toMatch(/painel da Cloudflare/);
  });

  it("recusa o que não é URL, sugerindo a forma certa", () => {
    expect(publicUrlProblem("forma-data")).toMatch(/não é uma URL/);
    expect(publicUrlProblem("pub-abc.r2.dev")).toMatch(/não é uma URL/);
  });

  it("recusa esquema que não seja http(s)", () => {
    expect(publicUrlProblem("s3://forma-data")).toMatch(/http\(s\)/);
  });
});
