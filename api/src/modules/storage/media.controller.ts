import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { IsString, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/roles";
import { StorageService } from "./storage.service";

export class RemoveImageDto {
  @IsString() @MinLength(1)
  key!: string;
}

/**
 * Upload de imagem de produto.
 *
 * O corpo chega CRU, em binário, em vez de `multipart/form-data`. Multipart
 * exigiria `multer` como dependência declarada só para desembrulhar um
 * arquivo por requisição — e o `rawBody` já está ligado nesta API, porque a
 * assinatura do webhook da Shopee precisa dos bytes exatos.
 *
 * Nada do que o cliente diz sobre o arquivo é usado: nem `Content-Type`, nem
 * nome. O tipo sai dos bytes e a chave é gerada no servidor.
 */
@Roles("superadmin")
@Controller("media")
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get("status")
  status() {
    return this.storage.status();
  }

  @Post("test")
  test() {
    return this.storage.testConnection();
  }

  @Post("products")
  async uploadProductImage(
    @Req() request: RawBodyRequest<Request>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const body = request.rawBody;
    if (!body || body.length === 0) {
      throw new BadRequestException(
        "Nenhum arquivo recebido. Envie os bytes da imagem no corpo da requisição.",
      );
    }

    const stored = await this.storage.storeProductImage(body);
    return { ...stored, uploadedBy: user.email };
  }

  /**
   * Remove um objeto do bucket. Separado do produto de propósito: apagar a
   * imagem junto com o produto arriscaria derrubar uma foto que outro produto
   * ainda usa, e o custo de um objeto órfão é irrisório perto disso.
   */
  @Delete("products")
  async removeProductImage(@Body() dto: RemoveImageDto) {
    await this.storage.removeProductImage(dto.key);
    return { removed: true };
  }
}
