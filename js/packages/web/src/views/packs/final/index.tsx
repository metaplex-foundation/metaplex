import React, { useState } from 'react';
import { Form, Button, Space } from 'antd';
import { Creator } from "@oyster/common";

import { ArtSelector } from "../../auctionCreate/artSelector";
import { SafetyDepositDraft } from "../../../actions/createAuctionManager";
import {ArtContent} from "../../../components/ArtContent";

function FinalStep({ attributes, confirm, backButton }) {


  return (
    <div className="form-box">
      {/*<ArtContent*/}
      {/*  pubkey={id}*/}
      {/*  uri={uri}*/}
      {/*  height={20}*/}
      {/*  width={20}*/}
      {/*/>*/}
      {backButton}
    </div>
  );
}

export default FinalStep;
