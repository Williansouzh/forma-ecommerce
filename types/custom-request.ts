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
  customerName: string;
  customerEmail: string;
  description: string;
  referenceImages: string[];
  type: CustomType;
  budget?: number;
  deadline?: string;
  status: RequestStatus;
  createdAt: Date;
}
