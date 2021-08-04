import { HashRouter } from 'react-router-dom';
import { Routes } from './routes';
import PageProviders from './views/PageProviders';

export default function App ({accounts}: any) {
  return (
    <HashRouter basename={'/'}>
      <PageProviders accounts={accounts}>
        <Routes />
      </PageProviders>
    </HashRouter>
  )
}
