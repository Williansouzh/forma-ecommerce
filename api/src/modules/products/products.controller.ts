import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { Public, Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/roles";
import { queryLimit, queryText } from "../../common/query-text";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Lista o catálogo. Sem sessão, devolve apenas as peças publicadas. */
  /*
   * O corte depende de QUEM pergunta, não da rota: o painel lê esta mesma
   * listagem e precisa das despublicadas para poder republicá-las. Até aqui a
   * promessa de que "peças despublicadas somem da loja" valia só na
   * interface — a API entregava rascunho, preço e nome de lançamento a quem
   * chamasse direto.
   *
   * Os parâmetros são declarados como `string` porque é isso que o contrato
   * pede do cliente; `queryText` existe justamente por não dar para confiar
   * nisso em tempo de execução (o `qs` do Express monta objeto a partir de
   * `?q[$ne]=x`).
   */
  @Public()
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("featured") featured?: string,
    @Query("sort") sort?: string,
    @Query("limit") limit?: string,
  ) {
    return this.productsService.findAll({
      category: queryText(category),
      q: queryText(q),
      featured: queryText(featured),
      sort: queryText(sort),
      limit: queryLimit(limit),
      includeUnpublished: user?.role === "superadmin",
    });
  }

  @Public()
  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) return null;
    return product;
  }

  @Roles("superadmin")
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * Mudança de `stock` aqui vira ajuste no ledger, assinado por quem pediu —
   * ver `ProductsService.update`.
   */
  @Roles("superadmin")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.email);
  }

  @Roles("superadmin")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
