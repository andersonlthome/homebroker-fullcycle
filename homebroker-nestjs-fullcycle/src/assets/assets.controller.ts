import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Sse,
  Param,
  MessageEvent,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Observable, map } from 'rxjs';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  all() {
    return this.assetsService.all();
  }

  // @Delete()
  // async deleteAll() {
  //   return await this.assetsService.delete();
  // }

  @Post()
  create(@Body() data: { id: string; symbol: string; price: number }) {
    return this.assetsService.create(data);
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.assetsService.subscribeEvents().pipe(
      map((event) => ({
        type: event.event,
        data: event.data,
      })),
    );
  }
}
