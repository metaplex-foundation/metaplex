import dynamic from 'next/dynamic';

const MainView = dynamic(
  (() => import('../../views').then(mod => mod.ArtistsView)) as any,
  { ssr: false }
);

const Providers = dynamic(
  (() => import('../../providers').then(mod => mod.Providers)) as any,
  { ssr: false }
);

function App() {
  return (
    <Providers>
      <MainView />
    </Providers>
  )
}

export default App;
