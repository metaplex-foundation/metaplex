import { useStore } from '@oyster/common';
import React, { useEffect } from 'react';
import { useMeta } from '../../contexts';
import { split } from 'lodash';
import {  useNavigate, useLocation } from 'react-router-dom';

export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const navigate = useNavigate();
  const location = useLocation();

  const { isConfigured } = useStore();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const [_, auction] = split(location.hash, `#/auction/`);


    if (!store || !isConfigured) {
      navigate("/setup");
      return;
    }
    
    if (auction) {
      navigate(`/listings/${auction}`);
    } else {
      navigate("/listings?view=live");
    }
  }, [isLoading, store, isConfigured]);

  return <></>;
};
