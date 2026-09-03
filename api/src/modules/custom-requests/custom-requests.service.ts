import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CustomRequest,
  CustomRequestDocument,
  RequestStatus,
} from "./schemas/custom-request.schema";
import { CreateCustomRequestDto } from "./dto/custom-request.dto";

type RawRequest = Omit<CustomRequest, "id"> & {
  _id?: Types.ObjectId | string;
};

const CODE_PREFIX = "ORC-";
const FIRST_CODE = 101;

@Injectable()
export class CustomRequestsService {
  constructor(
    @InjectModel(CustomRequest.name)
    private readonly requestModel: Model<CustomRequestDocument>,
  ) {}

  async findAll(status?: string): Promise<CustomRequest[]> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const rows = await this.requestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean<RawRequest[]>();
    return rows.map(mapId);
  }

  async create(dto: CreateCustomRequestDto): Promise<CustomRequest> {
    const created = await this.requestModel.create({
      ...dto,
      referenceImages: dto.referenceImages ?? [],
      type: dto.type ?? "other",
      status: "received",
      code: await this.nextCode(),
    });
    return mapId(created.toObject() as unknown as RawRequest);
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<CustomRequest> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Orçamento não encontrado");
    }
    const updated = await this.requestModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean<RawRequest | null>();
    if (!updated) throw new NotFoundException("Orçamento não encontrado");
    return mapId(updated);
  }

  /** Mesma ressalva da numeração de pedidos: sequência simples, sem contador. */
  private async nextCode(): Promise<string> {
    const last = await this.requestModel
      .findOne({ code: new RegExp(`^${CODE_PREFIX}\\d+$`) })
      .sort({ code: -1 })
      .lean<{ code?: string } | null>();
    const current = last?.code
      ? Number(last.code.slice(CODE_PREFIX.length))
      : FIRST_CODE - 1;
    return `${CODE_PREFIX}${current + 1}`;
  }
}

function mapId(row: RawRequest): CustomRequest {
  const { _id, __v, ...rest } = row as RawRequest & Record<string, unknown>;
  void __v;
  return { ...rest, id: String(_id) } as unknown as CustomRequest;
}
