import { ParsedAccount } from '..';
import { Metadata } from '../..';
import { IMetadataExtension } from '../../actions/metadata';

export interface CollectionsState {
  tokenMetadataByCollection: Record<
    string,
    Array<{
      ParsedAccount: ParsedAccount<Metadata>;
      MetadataExtension: IMetadataExtension;
    }>
  >;
}

export interface CollectionContextState extends CollectionsState {
  isLoading: boolean;
  update: () => void;
}
