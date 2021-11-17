import { ExclamationCircleOutlined } from '@ant-design/icons';
import React, { FC, ReactNode } from 'react';

import { Row } from '../../Row/Row';
import { ModalTitle } from '../ModalTitle';

export interface WarningProps {
  readonly content: ReactNode | ReactNode[] | string;
}

export const Warning: FC<WarningProps> = ({ content }) => (
  <div style={{ width: 343 }}>
    <ModalTitle />
    <Row justify="center" bottomGutter={6}>
      <ExclamationCircleOutlined
        style={{ fontSize: 80, color: 'var(--ergo-primary-color)' }}
      />
    </Row>
    {content}
  </div>
);
