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

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("featured") featured?: string,
    @Query("sort") sort?: string,
    @Query("limit") limit?: string,
  ) {
    return this.productsService.findAll({
      category,
      q,
      featured,
      sort,
      limit: limit ? Number(limit) : undefined,
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

  @Roles("superadmin")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Roles("superadmin")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
