import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Product,
  ProductDocument,
} from "./schemas/product.schema";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";

export interface ProductQuery {
  category?: string;
  q?: string;
  featured?: string;
  sort?: string;
  limit?: number;
}

type RawProduct = Omit<Product, "id"> & { _id?: Types.ObjectId | string };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async findAll(query: ProductQuery): Promise<Product[]> {
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.featured === "1" || query.featured === "true") {
      filter.isFeatured = true;
    }
    if (query.q) {
      const regex = new RegExp(
        query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filter.$or = [
        { name: regex },
        { shortDescription: regex },
        { tags: regex },
        { category: regex },
      ];
    }

    let cursor = this.productModel.find(filter);
    switch (query.sort) {
      case "price-asc":
        cursor = cursor.sort({ price: 1 });
        break;
      case "price-desc":
        cursor = cursor.sort({ price: -1 });
        break;
      case "newest":
        cursor = cursor.sort({ createdAt: -1 });
        break;
      default:
        cursor = cursor.sort({ isFeatured: -1, createdAt: -1 });
    }
    if (query.limit && query.limit > 0) {
      cursor = cursor.limit(query.limit);
    }

    const rows = await cursor.lean<RawProduct[]>();
    return rows.map(mapId);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await this.productModel
      .findOne({ slug })
      .lean<RawProduct | null>();
    return row ? mapId(row) : null;
  }

  async findRelated(
    slug: string,
    category: string,
    limit = 4,
  ): Promise<Product[]> {
    const rows = await this.productModel
      .find({ slug: { $ne: slug }, category })
      .limit(limit)
      .lean<RawProduct[]>();
    return rows.map(mapId);
  }

  async countByCategory(): Promise<Record<string, number>> {
    const rows = await this.productModel.aggregate<{
      _id: string;
      total: number;
    }>([{ $group: { _id: "$category", total: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((row) => [row._id, row.total]));
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const created = await this.productModel.create({
      ...dto,
      slug: await this.uniqueSlug(dto.slug || dto.name),
    });
    return mapId(created.toObject() as unknown as RawProduct);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Produto não encontrado");
    }
    const updated = await this.productModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean<RawProduct | null>();
    if (!updated) throw new NotFoundException("Produto não encontrado");
    return mapId(updated);
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Produto não encontrado");
    }
    const deleted = await this.productModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException("Produto não encontrado");
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let counter = 2;
    while (await this.productModel.exists({ slug: candidate }).exec()) {
      candidate = `${root}-${counter++}`;
    }
    return candidate;
  }
}

function mapId(row: RawProduct): Product {
  const { _id, __v, ...rest } = row as RawProduct & Record<string, unknown>;
  void __v;
  return { ...rest, id: String(_id) } as unknown as Product;
}
