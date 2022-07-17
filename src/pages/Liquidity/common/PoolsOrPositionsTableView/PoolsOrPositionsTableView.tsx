import { SearchDataState, Typography } from '@ergolabs/ui-kit';
import { Trans } from '@lingui/macro';
import React, { FC, PropsWithChildren } from 'react';

import { AmmPool } from '../../../../common/models/AmmPool';
import { Position } from '../../../../common/models/Position';
import { InfoTooltip } from '../../../../components/InfoTooltip/InfoTooltip';
import { ExpandComponentProps } from '../../../../components/TableView/common/Expand';
import { TableView } from '../../../../components/TableView/TableView';
import { AprColumn } from './columns/AprColumn/AprColumn';
import { PairColumn } from './columns/PairColumn/PairColumn';
import { RatioColumn } from './columns/RatioColumn/RatioColumn';
import { TvlOrVolume24Column } from './columns/TvlOrVolume24Column/TvlOrVolume24Column';

export interface PoolsOrPositionsTableViewProps<T extends AmmPool | Position> {
  readonly items: T[];
  readonly poolMapper: (item: T) => AmmPool;
  readonly expandComponent: FC<ExpandComponentProps<T>>;
}

export const PoolsOrPositionsTableView: FC<
  PropsWithChildren<PoolsOrPositionsTableViewProps<any>>
> = ({ children, poolMapper, items, expandComponent }) => (
  <TableView
    items={items}
    itemKey="id"
    itemHeight={80}
    maxHeight={376}
    gap={1}
    tableHeaderPadding={[0, 6]}
    tableItemViewPadding={[0, 4]}
    expand={{ height: 96, accordion: true, component: expandComponent }}
  >
    <TableView.Column width={311} headerWidth={303} title={<Trans>Pair</Trans>}>
      {(ammPool) => <PairColumn ammPool={poolMapper(ammPool)} />}
    </TableView.Column>
    <TableView.Column width={158} title={<Trans>TVL</Trans>}>
      {(ammPool) => <TvlOrVolume24Column usd={poolMapper(ammPool).tvl} />}
    </TableView.Column>
    <TableView.Column width={158} title={<Trans>Volume 24H</Trans>}>
      {(ammPool) => <TvlOrVolume24Column usd={poolMapper(ammPool).volume} />}
    </TableView.Column>
    <TableView.Column
      width={112}
      title={
        <InfoTooltip
          width={300}
          placement="top"
          content={
            <>
              <Trans>
                Annual Percentage Rate. Average estimation of how much you may
                potentially earn providing liquidity to this pool.
              </Trans>
              <br />
              <Typography.Link
                target="_blank"
                href="https://docs.ergodex.io/docs/protocol-overview/analytics#apr"
              >
                <Trans>Read more</Trans>
              </Typography.Link>
            </>
          }
        >
          <Trans>APR</Trans>
        </InfoTooltip>
      }
    >
      {(ammPool: AmmPool) => <AprColumn ammPool={poolMapper(ammPool)} />}
    </TableView.Column>
    <TableView.Column title={<Trans>Last 24H</Trans>} width={100}>
      {(ammPool) => <RatioColumn ammPool={poolMapper(ammPool)} />}
    </TableView.Column>
    {children}
    <TableView.State name="search" condition={!items.length}>
      <SearchDataState height={160}>
        <Trans>No results was found</Trans>
      </SearchDataState>
    </TableView.State>
  </TableView>
);
