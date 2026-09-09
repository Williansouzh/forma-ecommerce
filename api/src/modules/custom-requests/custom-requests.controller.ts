import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CustomRequestsService } from "./custom-requests.service";
import {
  CreateCustomRequestDto,
  UpdateCustomRequestStatusDto,
} from "./dto/custom-request.dto";
import { Public, Roles } from "../../common/decorators/auth.decorators";
import { queryText } from "../../common/query-text";

@Controller("custom-requests")
export class CustomRequestsController {
  constructor(private readonly service: CustomRequestsService) {}

  @Roles("superadmin")
  @Get()
  findAll(@Query("status") status?: string) {
    return this.service.findAll(queryText(status));
  }

  /** O formulário da loja envia sem sessão. */
  @Public()
  @Post()
  create(@Body() dto: CreateCustomRequestDto) {
    return this.service.create(dto);
  }

  @Roles("superadmin")
  @Patch(":id")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateCustomRequestStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
