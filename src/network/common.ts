import { AmmDexOperation } from '@ergolabs/ergo-dex-sdk';
import { TokenLock } from '@ergolabs/ergo-dex-sdk/build/main/security/entities';
import { Address } from '@ergolabs/ergo-sdk';
import { AssetInfo } from '@ergolabs/ergo-sdk/build/main/entities/assetInfo';
import { Observable } from 'rxjs';

import { AmmPool } from '../common/models/AmmPool';
import { Balance } from '../common/models/Balance';
import { Currency } from '../common/models/Currency';

export interface Network {
  readonly networkAsset$: Observable<AssetInfo>;
  readonly networkAssetBalance$: Observable<Currency>;
  readonly userPools$: Observable<AmmPool[]>;
  readonly assetBalance$: Observable<Balance>;
  readonly addresses$: Observable<Address[]>;
  readonly locks$: Observable<TokenLock[]>;
  readonly pendingTransactionsCount$: Observable<number>;
  readonly getTxHistory: (limit: number) => Observable<AmmDexOperation[]>;

  readonly useNetworkAsset: () => [AssetInfo, boolean, Error];
}
