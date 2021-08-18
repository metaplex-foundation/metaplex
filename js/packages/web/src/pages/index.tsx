import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

function App() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <CreateReactAppEntryPoint />;
}

export default App;
