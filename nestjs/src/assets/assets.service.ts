import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Asset } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Asset as AssetSchema } from './asset.schema';
import { Model } from 'mongoose';

@Injectable()
export class AssetsService {
  constructor(
    private prismaService: PrismaService,
    @InjectModel(AssetSchema.name)
    private assetModel: Model<AssetSchema>,
  ) {}

  all() {
    return this.prismaService.asset.findMany();
  }

  // async delete() {
  //   await this.prismaService.walletAsset.deleteMany();
  //   await this.prismaService.asset.deleteMany();
  //   await this.prismaService.order.deleteMany();
  //   await this.prismaService.wallet.deleteMany();
  //   return 'All assets deleted';
  // }

  create(data: { id: string; symbol: string; price: number }) {
    return this.prismaService.asset.create({
      data,
    });
  }

  subscribeEvents(): Observable<{
    event: 'asset-price-changed';
    data: Asset;
  }> {
    return new Observable((observer) => {
      this.assetModel
        .watch(
          [
            {
              $match: {
                operationType: 'update',
              },
            },
          ],
          { fullDocument: 'updateLookup' },
        )
        .on('change', async (data) => {
          const asset = await this.prismaService.asset.findUnique({
            where: { id: data.documentKey._id + '' },
          });
          observer.next({
            event: 'asset-price-changed',
            data: asset,
          });
        });
    });
  }
}
