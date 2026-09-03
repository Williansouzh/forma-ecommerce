import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateIntegrationDto {
  @IsOptional() @IsBoolean()
  enabled?: boolean;

  /** Valores que o painel pode ler de volta (número, mensagem, parcelas…). */
  @IsOptional() @IsObject()
  config?: Record<string, unknown>;

  /** Só de escrita: entra, é gravado, e nunca volta em GET. */
  @IsOptional() @IsObject()
  secrets?: Record<string, string>;

  /**
   * Nomes de credenciais a apagar. Campo em branco em `secrets` significa
   * "não mexe"; para trocar de token vazado é preciso poder remover.
   */
  @IsOptional() @IsArray() @IsString({ each: true })
  removeSecrets?: string[];
}
