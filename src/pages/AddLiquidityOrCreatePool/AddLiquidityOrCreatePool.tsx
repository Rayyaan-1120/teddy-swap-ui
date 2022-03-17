import { PoolId } from '@ergolabs/ergo-dex-sdk';
import { AssetInfo } from '@ergolabs/ergo-sdk/build/main/entities/assetInfo';
import { Skeleton } from 'antd';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';

import { getAmmPoolById, getAmmPoolsByAssetPair } from '../../api/ammPools';
import { assetBalance$ } from '../../api/assetBalance';
import { useSubscription } from '../../common/hooks/useObservable';
import { AmmPool } from '../../common/models/AmmPool';
import { TokeSelectFormItem } from '../../components/common/TokenControl/TokenSelect/TokenSelect';
import { Page } from '../../components/Page/Page';
import { Section } from '../../components/Section/Section';
import { Flex, Form, useForm } from '../../ergodex-cdk';
import { useNetworkAsset } from '../../services/new/core';
import { AddLiquidity } from './AddLiquidity/AddLiquidity';
import { CreatePool } from './CreatePool/CreatePool';

interface AssetFormModel {
  readonly x?: AssetInfo;
  readonly y?: AssetInfo;
  readonly pools?: AmmPool[];
}

const xAssets$ = assetBalance$.pipe(
  map((balance) => balance.values().map((balance) => balance.asset)),
);

const getAvailablePools = (
  xId?: string,
  yId?: string,
): Observable<AmmPool[]> => {
  return xId && yId ? getAmmPoolsByAssetPair(xId, yId) : of([]);
};

const getYAssets = (xId?: string) =>
  xId
    ? xAssets$.pipe(map((assets) => assets.filter((a) => a.id !== xId)))
    : xAssets$;

enum ComponentState {
  ADD_LIQUIDITY,
  CREATE_POOL,
}

export const AddLiquidityOrCreatePool: FC = () => {
  const [componentState, setComponentState] = useState<ComponentState>(
    ComponentState.ADD_LIQUIDITY,
  );
  const { poolId } = useParams<{ poolId?: PoolId }>();
  const [initialized, setInitialized] = useState<boolean>(!poolId);
  const networkAsset = useNetworkAsset();
  const form = useForm<AssetFormModel>({
    x: undefined,
    y: undefined,
    pools: undefined,
  });

  const updateYAssets$ = useMemo(
    () => new BehaviorSubject<string | undefined>(undefined),
    [],
  );
  const yAssets$ = useMemo(
    () => updateYAssets$.pipe(switchMap(getYAssets)),
    [],
  );

  const handleNewPoolButtonClick = () =>
    setComponentState(ComponentState.CREATE_POOL);

  useEffect(() => {
    if (!poolId) {
      form.patchValue({ x: networkAsset });
    }
  }, [networkAsset]);

  useSubscription(
    of(poolId).pipe(
      filter(Boolean),
      switchMap((poolId) => getAmmPoolById(poolId)),
      distinctUntilChanged((poolA, poolB) => poolA?.id === poolB?.id),
    ),
    (pool) => {
      form.patchValue(
        {
          x: pool?.x.asset,
          y: pool?.y.asset,
        },
        { emitEvent: 'system' },
      );
      setInitialized(true);
    },
  );

  useSubscription(
    combineLatest([
      form.controls.x.valueChangesWithSilent$.pipe(distinctUntilChanged()),
      form.controls.y.valueChangesWithSilent$.pipe(distinctUntilChanged()),
    ]).pipe(switchMap(([x, y]) => getAvailablePools(x?.id, y?.id))),
    (pools) => form.patchValue({ pools }),
  );

  useSubscription(
    form.controls.x.valueChangesWithSilent$,
    (asset: AssetInfo | undefined) => updateYAssets$.next(asset?.id),
  );

  useSubscription(
    form.controls.x.valueChangesWithSilent$,
    (asset: AssetInfo | undefined) => {
      if (asset?.id === form.value.y?.id) {
        form.patchValue({ y: undefined });
      }
    },
  );

  return (
    <Page title="Create pool" width={510} withBackButton>
      <Form form={form} onSubmit={() => {}}>
        {initialized ? (
          <Flex col>
            <Flex.Item marginBottom={4} display="flex" col>
              <Section title="Select Pair">
                <Flex justify="center" align="center">
                  <Flex.Item marginRight={2} flex={1}>
                    <TokeSelectFormItem name="x" assets$={xAssets$} />
                  </Flex.Item>
                  <Flex.Item flex={1}>
                    <TokeSelectFormItem name="y" assets$={yAssets$} />
                  </Flex.Item>
                </Flex>
              </Section>
            </Flex.Item>
            <Form.Listener>
              {({ value: { x, y, pools } }) =>
                (pools?.length &&
                  componentState === ComponentState.ADD_LIQUIDITY) ||
                !y ||
                !x ? (
                  <AddLiquidity
                    pools={pools}
                    xAsset={x}
                    yAsset={y}
                    onNewPoolButtonClick={handleNewPoolButtonClick}
                  />
                ) : (
                  <CreatePool xAsset={x} yAsset={y} />
                )
              }
            </Form.Listener>
          </Flex>
        ) : (
          <Skeleton active />
        )}
      </Form>
    </Page>
  );
};
