import React, { useState } from 'react';
import { Form, Button, Space } from 'antd';
import { Creator } from '@oyster/common';

import { ArtSelector } from '../../auctionCreate/artSelector';
import { ArtContent } from '../../../components/ArtContent';

function FinalStep({ attributes, confirm, backButton }) {
  console.log('attributes', attributes);

  return (
    <div className="form-box">
      {/*<ArtContent*/}
      {/*  pubkey={id}*/}
      {/*  uri={uri}*/}
      {/*  height={20}*/}
      {/*  width={20}*/}
      {/*/>*/}
      <div>
        <Button type="primary" htmlType="submit">
          Create pack
        </Button>
        {backButton}
      </div>
    </div>
  );
}

export default FinalStep;
