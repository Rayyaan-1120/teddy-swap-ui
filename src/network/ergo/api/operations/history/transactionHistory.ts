import { AmmDexOperation } from '@ergolabs/ergo-dex-sdk';
import {
  combineLatest,
  defaultIfEmpty,
  defer,
  first,
  map,
  of,
  publishReplay,
  refCount,
  switchMap,
  takeUntil,
} from 'rxjs';

import { Operation } from '../../../../../common/models/Operation';
import { tabClosing$ } from '../../../../../common/streams/tabClosing';
import { Dictionary } from '../../../../../common/utils/Dictionary';
import { localStorageManager } from '../../../../../common/utils/localStorageManager';
import { getAddresses } from '../../addresses/addresses';
import { mapToOperationOrEmpty } from '../common/mapToOperationOrEmpty';
import {
  addToTabQueue,
  getSyncProcessTabs,
  isPrimaryTab,
  removeFromTabQueue,
  syncProcessTabs$,
} from './tabManager';

interface TxHistoryCache {
  readonly handledTxs: Dictionary<Dictionary<boolean>>;
  readonly operations: Dictionary<AmmDexOperation[]>;
}

const TX_HISTORY_CACHE_KEY = 'tx-transactionHistory-cache';

const TX_HISTORY_SYNCING_KEY = 'tx-transactionHistory-syncing';

const addresses$ = getAddresses().pipe(first(), publishReplay(1), refCount());

let isWorkerActive = false;

export const sync = (): void => {
  localStorageManager.set(TX_HISTORY_SYNCING_KEY, true);
  addToTabQueue();
  isWorkerActive = true;
  addresses$.subscribe();
};

tabClosing$.subscribe(() => removeFromTabQueue());

syncProcessTabs$.pipe(takeUntil(tabClosing$)).subscribe(() => {
  const isSyncing = localStorageManager.get(TX_HISTORY_SYNCING_KEY);
  const txHistory = localStorageManager.get(TX_HISTORY_CACHE_KEY);
  const tabs = getSyncProcessTabs();

  if (
    (!txHistory && !isSyncing) ||
    (isSyncing && !tabs.length) ||
    (isSyncing && isPrimaryTab() && !isWorkerActive)
  ) {
    sync();
  }
  if (isSyncing && tabs.length) {
    addToTabQueue();
  }
});

export const isSyncing$ = localStorageManager
  .getStream<boolean>(TX_HISTORY_SYNCING_KEY)
  .pipe(map(Boolean));

export const operationsHistory$ = addresses$.pipe(
  switchMap((addresses) =>
    localStorageManager
      .getStream<TxHistoryCache>(TX_HISTORY_CACHE_KEY)
      .pipe(
        map<
          TxHistoryCache | undefined | null,
          [TxHistoryCache | undefined | null, string[]]
        >((txHistory) => [txHistory, addresses]),
      ),
  ),
  switchMap(([txHistory, addresses]) => {
    if (!txHistory) {
      return of([]);
    }

    return defer(() =>
      of(
        Object.entries(txHistory.operations)
          .filter(([address]) => addresses.includes(address))
          .flatMap(([, txs]) => txs),
      ),
    );
  }),
  switchMap((operations) =>
    combineLatest(operations.map(mapToOperationOrEmpty)).pipe(
      defaultIfEmpty([]),
    ),
  ),
  map((operations) => operations.filter(Boolean) as Operation[]),
  publishReplay(1),
  refCount(),
);
