import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { t } from '@lingui/macro';
import { TxCandidate } from '@teddyswap/cardano-dex-sdk';
import { DepositTxInfo } from '@teddyswap/cardano-dex-sdk/build/main/amm/interpreters/ammTxBuilder/depositAmmTxBuilder';
import { NetworkParams } from '@teddyswap/cardano-dex-sdk/build/main/cardano/entities/env';
import { first, map, Observable, Subject, switchMap, tap, zip } from 'rxjs';

import { Balance } from '../../../../common/models/Balance';
import { Currency } from '../../../../common/models/Currency';
import { captureOperationError } from '../../../../common/services/ErrorLogs';
import { TxId } from '../../../../common/types';
import { AddLiquidityFormModel } from '../../../../components/AddLiquidityForm/AddLiquidityFormModel';
import {
  openConfirmationModal,
  Operation,
} from '../../../../components/ConfirmationModal/ConfirmationModal';
import { OperationValidator } from '../../../../components/OperationForm/OperationForm';
import { depositMaxButtonClickForNative } from '../../../common/depositMaxButtonClickForNative';
import {
  CardanoSettings,
  settings$,
  useSettings,
} from '../../settings/settings';
import { DepositConfirmationModal } from '../../widgets/DepositConfirmationModal/DepositConfirmationModal';
import { CardanoAmmPool } from '../ammPools/CardanoAmmPool';
import { cardanoNetworkParams$ } from '../common/cardanoNetwork';
import { networkAsset } from '../networkAsset/networkAsset';
import { ammTxFeeMapping } from './common/ammTxFeeMapping';
import { minExecutorReward } from './common/minExecutorReward';
import { submitTx } from './common/submitTxCandidate';
import { transactionBuilder$ } from './common/transactionBuilder';

interface DepositTxCandidateConfig {
  readonly pool: CardanoAmmPool;
  readonly x: Currency;
  readonly y: Currency;
  readonly settings: CardanoSettings;
  readonly networkParams: NetworkParams;
}

const toDepositTxCandidate = ({
  pool,
  x,
  y,
  settings,
}: DepositTxCandidateConfig): Observable<Transaction> => {
  if (!settings.address || !settings.ph) {
    throw new Error('[deposit]: wallet address is not selected');
  }

  const xAmount = pool.pool.x.withAmount(x.amount);
  const yAmount = pool.pool.y.withAmount(y.amount);

  return transactionBuilder$.pipe(
    switchMap((txBuilder) =>
      txBuilder.deposit({
        x: xAmount,
        y: yAmount,
        pool: pool.pool as any,
        slippage: settings.slippage,
        txFees: ammTxFeeMapping,
        minExecutorReward: minExecutorReward,
        changeAddress: settings.address!,
        pk: settings.ph!,
      }),
    ),
    map(
      (data: [Transaction | null, TxCandidate, DepositTxInfo, Error | null]) =>
        data[0]!,
    ),
    first(),
  );
};

export const walletDeposit = (
  pool: CardanoAmmPool,
  x: Currency,
  y: Currency,
): Observable<TxId> =>
  zip([cardanoNetworkParams$, settings$]).pipe(
    first(),
    switchMap(([networkParams, settings]) =>
      toDepositTxCandidate({
        pool,
        x,
        y,
        networkParams,
        settings,
      }),
    ),
    switchMap((tx) => submitTx(tx)),
    tap({
      error: (error) => captureOperationError(error, 'cardano', 'deposit'),
    }),
  );

export const deposit = (
  data: Required<AddLiquidityFormModel>,
  withoutConfirmation?: boolean,
): Observable<TxId> => {
  const subject = new Subject<TxId>();

  if (withoutConfirmation) {
    openConfirmationModal(
      walletDeposit(
        data.pool as any,
        data.x.asset.id === data.pool.x.asset.id ? data.x : data.y,
        data.y.asset.id === data.pool.y.asset.id ? data.y : data.x,
      ).pipe(
        tap((txId) => {
          subject.next(txId);
          subject.complete();
        }),
      ),
      Operation.ADD_LIQUIDITY,
      {
        xAsset: data.x!,
        yAsset: data.y!,
      },
    );
  } else {
    openConfirmationModal(
      (next) => {
        return (
          <DepositConfirmationModal
            value={data}
            onClose={(request) =>
              next(
                request.pipe(
                  tap((txId) => {
                    subject.next(txId);
                    subject.complete();
                  }),
                ),
              )
            }
          />
        );
      },
      Operation.ADD_LIQUIDITY,
      {
        xAsset: data.x!,
        yAsset: data.y!,
      },
    );
  }

  return subject.asObservable();
};

export const useDepositValidators =
  (): OperationValidator<AddLiquidityFormModel>[] => {
    const settings = useSettings();

    const insufficientFeeValidator: OperationValidator<
      Required<AddLiquidityFormModel>
    > = ({ value: { x, y, pool } }) => {
      return transactionBuilder$.pipe(
        switchMap((txBuilder) =>
          txBuilder.deposit({
            x: pool.pool.x.withAmount(x.amount) as any,
            y: pool.pool.y.withAmount(y.amount) as any,
            pool: pool.pool as any,
            slippage: settings.slippage,
            txFees: ammTxFeeMapping,
            minExecutorReward: minExecutorReward,
            changeAddress: settings.address!,
            pk: settings.ph!,
          }),
        ),
        map(
          (
            data: [
              Transaction | null,
              TxCandidate,
              DepositTxInfo,
              Error | null,
            ],
          ) => {
            const error = data[3];
            if (error && !data[0]) {
              captureOperationError(
                error,
                'cardano',
                'depositValidation',
                data[1],
                data[2],
              );
            }

            return data[0]
              ? undefined
              : t`Insufficient ${networkAsset.ticker} balance for fees`;
          },
        ),
        first(),
      );
    };

    return [insufficientFeeValidator as any];
  };

export const useHandleDepositMaxButtonClick = (): ((
  pct: number,
  value: AddLiquidityFormModel,
  balance: Balance,
) => [Currency, Currency]) => {
  return (pct, value, balance) => {
    return depositMaxButtonClickForNative(new Currency(0n, networkAsset))(
      pct,
      value,
      balance,
    );
  };
};
