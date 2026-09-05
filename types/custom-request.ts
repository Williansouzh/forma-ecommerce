export type CustomType =
  | "character"
  | "gift"
  | "miniature"
  | "decoration"
  | "functional"
  | "other";

export type RequestStatus =
  | "received"
  | "analyzing"
  | "quoted"
  | "approved"
  | "modeling"
  | "printing"
  | "finished";

export interface CustomRequest {
  id: string;
  /** Código curto do orçamento: ORC-101. */
  code: string;
  customerName: string;
  customerEmail: string;
  description: string;
  referenceImages: string[];
  type: CustomType;
  budget?: number;
  deadline?: string;
  status: RequestStatus;
  customerPhone?: string;
  createdAt: string | Date;
}
