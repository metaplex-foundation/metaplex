import { Storefront } from '@oyster/common';
import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { PreLaunchView } from './';
import { Providers } from './providers';

export function Routes({ storefront }: { storefront: Storefront }) {
  return (
    <>
      <HashRouter basename="/">
        <Providers storefront={storefront}>
          <Switch>
            <Route path="/" component={() => <PreLaunchView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
