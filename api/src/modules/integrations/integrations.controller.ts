import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { UpdateIntegrationDto } from "./dto/integration.dto";
import type { IntegrationKey } from "./schemas/integration.schema";
import { Roles } from "../../common/decorators/auth.decorators";

@Roles("superadmin")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  findAll() {
    return this.integrationsService.findAll();
  }

  @Patch(":key")
  update(@Param("key") key: IntegrationKey, @Body() dto: UpdateIntegrationDto) {
    return this.integrationsService.update(key, dto);
  }

  @Post("mercadopago/test")
  testMercadoPago() {
    return this.integrationsService.testMercadoPago();
  }
}
