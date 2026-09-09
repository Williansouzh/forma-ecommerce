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

  /**
   * Pública, mas não igual para todo mundo.
   *
   * Sem sessão, a listagem devolve só o que está publicado — o painel diz
   * "peças despublicadas somem da loja", e até aqui isso valia só na
   * interface: a API entregava rascunho, preço e nome de lançamento futuro a
   * quem chamasse a rota direto. Com token de superadmin, o painel continua
   * recebendo tudo, que é o que ele precisa para poder republicar.
   */
  @Public()
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("category") category?: unknown,
    @Query("q") q?: unknown,
    @Query("featured") featured?: unknown,
    @Query("sort") sort?: unknown,
    @Query("limit") limit?: unknown,
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
