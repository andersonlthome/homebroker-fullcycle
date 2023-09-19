import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { WalletAssetsService } from './wallet-assets.service';
import { Observable, map } from 'rxjs';

@Controller('wallets/:wallet_id/assets')
export class WalletAssetsController {
  constructor(private walletAssetsService: WalletAssetsService) {}

  @Get()
  all(@Param('wallet_id') wallet_id: string) {
    return this.walletAssetsService.all({ wallet_id });
  }

  @Post()
  async create(
    @Param('wallet_id') wallet_id: string,
    @Body() body: { asset_id: string; shares: number },
  ) {
    const wa = await this.walletAssetsService.create({
      wallet_id,
      ...body,
    });

    if (!wa) throw new BadRequestException('Wallet not found');

    return wa;
  }

  @Sse('events')
  events(@Param('wallet_id') wallet_id: string): Observable<MessageEvent> {
    return this.walletAssetsService.subscribeEvents(wallet_id).pipe(
      map((event) => ({
        type: event.event,
        data: event.data,
      })),
    );
  }
}
