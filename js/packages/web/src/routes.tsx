import { HashRouter, Route, Switch } from 'react-router-dom';
import { Providers } from './providers';
import {
  HomeView,
} from './views';

export function Routes() {
  return (
    <>
      <HashRouter basename={'/'}>
        <Providers>
          <Switch>
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
