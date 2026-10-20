import { IsString, Length } from "class-validator";

export class AppPairingExchangeDto {
  @IsString()
  @Length(16, 64)
  code!: string;
}
