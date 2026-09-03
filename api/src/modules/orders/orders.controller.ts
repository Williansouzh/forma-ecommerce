import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { Public, Roles } from "../../common/decorators/auth.decorators";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles("superadmin")
  @Get()
  findAll(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ordersService.findAll({
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** O checkout da loja cria o pedido sem sessão de admin. */
  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Roles("superadmin")
  @Patch(":id")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
