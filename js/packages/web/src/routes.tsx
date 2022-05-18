import React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Providers } from './providers'
import {
  ArtView,
  ArtistView,
  ArtistsView,
  AuctionView,
  ArtworksView,
  AnalyticsView,
  ArtCreateView,
  AuctionCreateView,
} from './views'
import { AdminView } from './views/admin'
import PackView from './views/pack'
import { PackCreateView } from './views/packCreate'
import { BillingView } from './views/auction/billing'

/* New view components */
import { LaunchPadSubmission } from './components-v2/views'

/* UI v2 Upgraded Views */
import ScrollToTop from './ScrollToTop'
import {
  Home,
  Collection,
  Discover,
  NFTDetails,
  NftNext,
  Donations,
  Launchpad,
  LaunchpadDetails,
  Community,
  MyProfile,
  Article,
  About,
} from './ui/views'

import { SalesListView } from './views/home/components/SalesList'

export function Routes() {
  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true'
  return (
    <>
      <HashRouter basename={'/'}>
        <ScrollToTop>
          <Providers>
            <Switch>
              {shouldEnableNftPacks && (
                <Route
                  exact
                  path='/admin/pack/create/:stepParam?'
                  component={() => <PackCreateView />}
                />
              )}
              {shouldEnableNftPacks && (
                <Route exact path='/pack/:packKey' component={() => <PackView />} />
              )}
              <Route exact path='/admin' component={() => <AdminView />} />
              <Route exact path='/analytics' component={() => <AnalyticsView />} />
              <Route exact path='/allitems' component={() => <SalesListView />} />
              <Route exact path='/art/create/:step_param?' component={() => <ArtCreateView />} />
              <Route exact path='/artworks/:id?' component={() => <ArtworksView />} />
              <Route exact path='/art/:id/' component={() => <ArtView />} />
              <Route exact path='/artists/:id' component={() => <ArtistView />} />
              <Route exact path='/artists' component={() => <ArtistsView />} />
              <Route
                exact
                path='/auction/create/:step_param?'
                component={() => <AuctionCreateView />}
              />
              <Route exact path='/auction/:id' component={() => <AuctionView />} />
              <Route exact path='/auction/:id/billing' component={() => <BillingView />} />
              <Route path='/discover' component={() => <Discover />} />
              <Route path='/collection/:id' component={() => <Collection />} />
              <Route path='/nft/:id' component={() => <NFTDetails />} />
              <Route path='/nft-next/:id' component={() => <NftNext />} />
              <Route
                path='/launchpad-submission/:id/:name'
                component={() => <LaunchPadSubmission />}
              />
              <Route path='/launchpad-submission' component={() => <LaunchPadSubmission />} />
              <Route exact path='/launchpad' component={() => <Launchpad />} />
              <Route exact path='/communities' component={() => <Community />} />
              <Route exact path='/profile/:id?' component={() => <MyProfile />} />
              <Route exact path='/launchpad/:id' component={() => <LaunchpadDetails />} />
              <Route path='/donations' component={() => <Donations />} />

              <Route path='/about' component={() => <About />} />
              <Route path='/mission' component={() => <Article />} />
              <Route path='/team' component={() => <Article />} />
              <Route path='/activity-stats' component={() => <Article />} />
              <Route path='/resources' component={() => <Article />} />
              <Route path='/return-policy' component={() => <Article />} />
              <Route path='/terms-of-condition' component={() => <Article />} />
              <Route path='/cookies' component={() => <Article />} />
              <Route path='/privacy-policy' component={() => <Article />} />

              <Route path='/' component={() => <Home />} />

              {/* <Route path='/collection/:id' component={() => <CollectionDetailView />} /> */}
              {/* <Route exact path='/auction/:id' component={() => <AuctionView />} />
            <Route exact path='/auction/:id/billing' component={() => <BillingView />} /> */}
              {/* <Route path='/about' component={() => <StaticPageView />} />
            <Route path='/explore' component={() => <Explore />} />
            <Route path='/collection' component={() => <Collection />} />
            <Route path='/static-content' component={() => <StaticContent />} />
            <Route path='/submit-collection' component={() => <SubmitCollection />} />
            */}
            </Switch>
          </Providers>
        </ScrollToTop>
      </HashRouter>
    </>
  )
}
