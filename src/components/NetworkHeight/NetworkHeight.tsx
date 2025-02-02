import './NetworkHeight.less';

import { Flex, Tooltip, Typography } from '@ergolabs/ui-kit';
import { t } from '@lingui/macro';
// @ts-ignore
import FlipNumbers from 'react-flip-numbers';

import { ReactComponent as BlockIcon } from '../../assets/icons/blockchain.svg';
import { useObservable } from '../../common/hooks/useObservable';
import { networkContext$ } from '../../gateway/api/networkContext';
import { useSelectedNetwork } from '../../gateway/common/network';
import { exploreLastBlock } from '../../gateway/utils/exploreAddress';
import { formatToInt } from '../../services/number';
const NetworkHeight = (): JSX.Element => {
  const [networkContext] = useObservable(networkContext$);
  const [selectedNetwork] = useSelectedNetwork();

  const tooltip =
    selectedNetwork.name !== 'ergo'
      ? t`The most recent block in Cardano (Testnet) network`
      : t`The most recent block in Ergo network`;

  return (
    <>
      {networkContext ? (
        <Typography.Link
          onClick={() => exploreLastBlock(networkContext?.lastBlockId)}
          strong
          className="network-height"
          type="success"
          target="_blank"
        >
          <Tooltip title={tooltip} placement="left">
            <Flex justify="space-between" align="center">
              <BlockIcon />
              <Flex.Item marginLeft={1}>
                <FlipNumbers
                  numbers={formatToInt(networkContext.height)}
                  play
                  perspective={100}
                  height={12}
                  width={8}
                />
              </Flex.Item>
            </Flex>
          </Tooltip>
        </Typography.Link>
      ) : null}
    </>
  );
};

export { NetworkHeight };
