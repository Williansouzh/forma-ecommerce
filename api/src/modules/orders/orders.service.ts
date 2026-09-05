import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument, OrderStatus } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/order.dto";

export interface OrderQuery {
  status?: string;
  limit?: number;
}

type RawOrder = Omit<Order, "id"> & { _id?: Types.ObjectId | string };

const CODE_PREFIX = "C3D-";
const FIRST_CODE = 4801;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async findAll(query: OrderQuery): Promise<Order[]> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    let cursor = this.orderModel.find(filter).sort({ createdAt: -1 });
    if (query.limit && query.limit > 0) cursor = cursor.limit(query.limit);

    const rows = await cursor.lean<RawOrder[]>();
    return rows.map(mapId);
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const created = await this.orderModel.create({
      ...dto,
      shipping: dto.shipping ?? 0,
      discount: dto.discount ?? 0,
      status: "pending",
      code: await this.nextCode(),
    });
    return mapId(created.toObject() as unknown as RawOrder);
  }

  async findByCode(code: string): Promise<Order | null> {
    const row = await this.orderModel.findOne({ code }).lean<RawOrder | null>();
    return row ? mapId(row) : null;
  }

  /** Usado pelo webhook de pagamento, que conhece o pedido pelo código. */
  async markPaidByCode(code: string): Promise<Order | null> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { code, status: "pending" },
        { $set: { status: "paid" } },
        { new: true },
      )
      .lean<RawOrder | null>();
    return updated ? mapId(updated) : null;
  }

  async attachPayment(
    code: string,
    preferenceId: string,
    paymentUrl: string,
  ): Promise<Order | null> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { code },
        { $set: { paymentPreferenceId: preferenceId, paymentUrl } },
        { new: true },
      )
      .lean<RawOrder | null>();
    return updated ? mapId(updated) : null;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Pedido não encontrado");
    }
    const updated = await this.orderModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean<RawOrder | null>();
    if (!updated) throw new NotFoundException("Pedido não encontrado");
    return mapId(updated);
  }

  /**
   * Sequência legível a partir do maior código já gravado. Um ateliê tem um
   * pedido por vez; se o volume crescer, trocar por uma coleção de contadores
   * com $inc, que é atômica.
   */
  private async nextCode(): Promise<string> {
    const last = await this.orderModel
      .findOne({ code: new RegExp(`^${CODE_PREFIX}\\d+$`) })
      .sort({ code: -1 })
      .lean<{ code?: string } | null>();
    const current = last?.code
      ? Number(last.code.slice(CODE_PREFIX.length))
      : FIRST_CODE - 1;
    return `${CODE_PREFIX}${current + 1}`;
  }
}

function mapId(row: RawOrder): Order {
  const { _id, __v, ...rest } = row as RawOrder & Record<string, unknown>;
  void __v;
  return { ...rest, id: String(_id) } as unknown as Order;
}
