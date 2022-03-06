import { useMeta, useWallet} from '@oyster/common'
import { useCreatorArts } from '../../../hooks'

import { ArtworkViewState, Item } from '../types'
import { usePacksBasedOnProvingProcesses } from './usePacksBasedOnProvingProcesses'
import { useUserMetadataWithPacks } from './useUserMetadataWithPacks'

export const useItems = ({ activeKey }: { activeKey: ArtworkViewState }): Item[] => {
  const { publicKey } = useWallet();
  console.log(activeKey)
  const { metadata } = useMeta()
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const userMetadataWithPacks = useUserMetadataWithPacks();
  const packsBasedOnProvingProcesses = usePacksBasedOnProvingProcesses();

  if (activeKey === ArtworkViewState.Owned) {
    return [...userMetadataWithPacks, ...packsBasedOnProvingProcesses];
  }

  if (activeKey === ArtworkViewState.Created) {
    return createdMetadata;
  }

  return metadata
}
