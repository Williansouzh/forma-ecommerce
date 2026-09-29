import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomRequestsController } from "./custom-requests.controller";
import { CustomRequestsService } from "./custom-requests.service";
import {
  CustomRequest,
  CustomRequestSchema,
} from "./schemas/custom-request.schema";
import { SequencesModule } from "../sequences/sequences.module";
import { StoreClientModule } from "../../common/store-client.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomRequest.name, schema: CustomRequestSchema },
    ]),
    SequencesModule,
    StoreClientModule,
  ],
  controllers: [CustomRequestsController],
  providers: [CustomRequestsService],
})
export class CustomRequestsModule {}
