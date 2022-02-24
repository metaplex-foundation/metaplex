import React from 'react';
import { Storefront } from '@oyster/common';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import {
  ArtistView,
  ArtView,
  ArtworksView,
  AuctionCreateView,
  AuctionView,
  HomeView,
  SetupView,
  Listings,
} from './views';
import { AdminView } from './views/admin';
import { BillingView } from './views/auction/billing';

interface AppProps {
  storefront: Storefront;
}

function App({ storefront }: AppProps) {
  return (
    <BrowserRouter>
      <Providers storefront={storefront}>
        <Routes>
          <Route path="/admin" element={<AdminView />} />
          <Route path="/owned" element={<ArtworksView />} />
          <Route path="/creators/:creator/nfts/:nft" element={<ArtView />} />
          <Route path="/creators/:creator" element={<ArtistView />} />
          <Route
            path="/listings/new/:step_param"
            element={<AuctionCreateView />}
          />
          <Route
            path="/listings/:id/billing"
            element={<BillingView />}
          />
          <Route path="/listings" element={<Listings />} />
          <Route
            path="/listings/:id"
            element={<AuctionView />}
          />
          <Route path="/setup" element={<SetupView />} />
          <Route path="/" element={<HomeView />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
