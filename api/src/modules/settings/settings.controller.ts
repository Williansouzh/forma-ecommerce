import { Body, Controller, Get, Patch } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/settings.dto";
import { Public, Roles } from "../../common/decorators/auth.decorators";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** A loja lê no servidor para montar frete e desconto. Nada sensível aqui. */
  @Public()
  @Get()
  get() {
    return this.settingsService.get();
  }

  @Roles("superadmin")
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
