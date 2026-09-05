import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomRequestsController } from "./custom-requests.controller";
import { CustomRequestsService } from "./custom-requests.service";
import {
  CustomRequest,
  CustomRequestSchema,
} from "./schemas/custom-request.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomRequest.name, schema: CustomRequestSchema },
    ]),
  ],
  controllers: [CustomRequestsController],
  providers: [CustomRequestsService],
})
export class CustomRequestsModule {}
