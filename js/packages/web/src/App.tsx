import React from 'react';
import { Routes } from './routes';

interface AppProps {
  storeId: string;
}

function App({ storeId }: AppProps) {
  return <Routes storeId={storeId} />;
}

export default App;
