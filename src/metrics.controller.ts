import { Controller, Get, Res } from "@nestjs/common";
import { PrometheusController } from "@flowcore/microservice";
import { Response } from "express";

@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  async index(@Res() response: Response) {
    return super.index(response);
  }
}
