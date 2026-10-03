import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"

import { RequestContextModule } from "@neomaventures/request-context"

import { EchoController } from "./echo.controller"
import { profileProvider } from "./profile-slot"
import { ProfileMiddleware } from "./profile.middleware"
import { RequestReaderService } from "./request-reader.service"

@Module({
  imports: [RequestContextModule.forRoot()],
  controllers: [EchoController],
  providers: [RequestReaderService, profileProvider],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ProfileMiddleware).forRoutes("*")
  }
}
