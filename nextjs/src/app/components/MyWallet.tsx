"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableHeadCell,
  TableRow,
} from "../components/flowbite-components";
import { WalletAsset } from "../models";
import Link from "next/link";
import { fetcher, isHomeBrokerClosed } from "../utils";
import useSWR from "swr";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";

// Server Components - com controle de cache
// async function getWalletAssets(wallet_id: string): Promise<WalletAsset[]> {
//   const response = await fetch(
//     `http://host.docker.internal:3000/wallets/${wallet_id}/assets`,
//     {
//       //cache: 'no-store', processamento sempre dinamico
//       next: {
//         //revalidate: isHomeBrokerClosed() ? 60 * 60 : 5,
//         revalidate: 1, // 1 segundo
//       },
//     }
//   );
//   return response.json();
// }

// export default async function quando for um componente server,
// utilizado client component para poder fazer a subscription dos eventos de assets e prices
export default function MyWallet(props: { wallet_id: string }) {
  // server component
  // const walletAssets = await getWalletAssets(props.wallet_id);
  console.log("MyWallet", props.wallet_id);
  // client component conexão direta com o NestJS
  // http://localhost:3000/wallets/${props.wallet_id}/assets
  // chamada para a API interna do NextJS para usar o cacheamento otimizado
  const {
    data: walletAssets,
    error,
    mutate: mutateWalletAssets,
  } = useSWR<WalletAsset[]>(
    `http://localhost:3001/api/wallets/${props.wallet_id}/assets`,
    fetcher,
    { fallbackData: [], revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const { data: walletAssetUpdated } = useSWRSubscription(
    `http://localhost:3000/wallets/${props.wallet_id}/assets/events`,
    (path, { next }: SWRSubscriptionOptions) => {
      const eventSource = new EventSource(path);

      eventSource.addEventListener("wallet-asset-updated", async (event) => {
        const walletAssetUpdated = JSON.parse(event.data);
        await mutateWalletAssets((prev) => {
          const foundIndex = prev?.findIndex(
            (walletAssets) =>
              walletAssets.Asset.id === walletAssetUpdated.asset_id
          );
          if (foundIndex !== -1) {
            prev![foundIndex!].shares = walletAssetUpdated.shares;
          }

          return [...prev!];
        }, false); // false para não revalidar o cache, somente modificação local

        next(null, walletAssetUpdated);
      });

      eventSource.onerror = (error) => {
        console.error(error);
        eventSource.close();
      };

      // unsubscribe, works like useEffect
      return () => {
        eventSource.close();
      };
    }
  );

  // AssetUpdated show that was updated, but the value is modified in mutateWalletAssets
  const { data: AssetUpdated } = useSWRSubscription(
    `http://localhost:3000/assets/events`,
    (path, { next }: SWRSubscriptionOptions) => {
      const eventSource = new EventSource(path);

      eventSource.addEventListener("asset-price-changed", async (event) => {
        const assetChanged = JSON.parse(event.data);
        await mutateWalletAssets((prev) => {
          const foundIndex = prev?.findIndex(
            (walletAssets) => walletAssets.asset_id === assetChanged.id
          );
          if (foundIndex !== -1) {
            prev![foundIndex!].Asset.price = assetChanged.price;
          }

          return [...prev!];
        }, false); // false para não revalidar o cache, somente modificação local

        next(null, assetChanged);
      });

      eventSource.onerror = (error) => {
        console.error(error);
        eventSource.close();
      };

      // unsubscribe, works like useEffect
      return () => {
        eventSource.close();
      };
    }
  );

  return (
    <Table>
      <TableHead>
        <TableHeadCell>Nome</TableHeadCell>
        <TableHeadCell>Preço R$</TableHeadCell>
        <TableHeadCell>Quant.</TableHeadCell>
        <TableHeadCell>
          <span className="sr-only">Comprar/Vender</span>
        </TableHeadCell>
      </TableHead>
      <TableBody className="divide-y">
        {walletAssets!.map((walletAsset, key) => (
          <TableRow className="border-gray-700 bg-gray-800" key={key}>
            <TableCell className="whitespace-nowrap font-medium text-white">
              {walletAsset.Asset.id} ({walletAsset.Asset.symbol})
            </TableCell>
            <TableCell>{walletAsset.Asset.price}</TableCell>
            <TableCell>{walletAsset.shares}</TableCell>
            <TableCell>
              <Link
                className="font-medium hover:underline text-cyan-500"
                href={`/${props.wallet_id}/home-broker/${walletAsset.Asset.id}`}
              >
                Comprar/Vender
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
//Server Components
//Client Components
