import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  SETTINGS_KEY,
  Settings,
  SettingsDocument,
} from "./schemas/settings.schema";
import { UpdateSettingsDto } from "./dto/settings.dto";

type PublicSettings = Omit<Settings, "_id" | "key" | "createdAt" | "updatedAt">;

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  /** Cria o documento com os padrões na primeira leitura. */
  async get(): Promise<PublicSettings> {
    const row = await this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $setOnInsert: { key: SETTINGS_KEY } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<Settings>();
    return strip(row);
  }

  async update(dto: UpdateSettingsDto): Promise<PublicSettings> {
    const row = await this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: dto, $setOnInsert: { key: SETTINGS_KEY } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<Settings>();
    return strip(row);
  }
}

/** `.lean()` não passa pelo toJSON do schema, então a limpeza é manual. */
function strip(row: Settings): PublicSettings {
  const { _id, __v, key, createdAt, updatedAt, ...rest } = row as Settings &
    Record<string, unknown>;
  void _id;
  void __v;
  void key;
  void createdAt;
  void updatedAt;
  return rest as PublicSettings;
}
