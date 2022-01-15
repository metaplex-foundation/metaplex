import dynamic from 'next/dynamic';
import React from 'react';

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

function App() {
  return <CreateReactAppEntryPoint />;
}

export default App;
