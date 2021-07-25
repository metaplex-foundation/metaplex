import React from 'react';
import { Routes } from './routes';
import { Storefront } from './models/storefront'

interface AppProps {
  storefront: Storefront;
}

function App({ storefront }: AppProps) {
  return <Routes storefront={storefront} />;
}

export default App;
