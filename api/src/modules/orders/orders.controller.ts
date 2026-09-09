import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { WhatsappService } from "../notifications/whatsapp.service";
import { Public, Roles } from "../../common/decorators/auth.decorators";
import { queryLimit, queryText } from "../../common/query-text";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Roles("superadmin")
  @Get()
  findAll(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    // `queryText`: o parser do Express monta objeto a partir de
    // `?status[$ne]=x`, e esse valor ia direto para o filtro do Mongo.
    return this.ordersService.findAll({
      status: queryText(status),
      limit: queryLimit(limit),
    });
  }

  /** O checkout da loja cria o pedido sem sessão de admin. */
  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  /**
   * Trocar a etapa avisa o cliente. O aviso é secundário: se falhar, o status
   * muda do mesmo jeito e a resposta diz por que a mensagem não saiu.
   */
  @Roles("superadmin")
  @Patch(":id")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(id, dto.status);
    const notification = await this.whatsapp.notifyOrderStage(
      order.customer.phone,
      order.code,
      order.status,
    );
    return { ...order, notification };
  }
}
