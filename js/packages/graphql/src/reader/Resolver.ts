import { Metadata } from '../types/sourceTypes';
import { IReader } from './Reader';

export class Resolver {
  constructor(public api: IReader) {}

  private async artEditions(item: Metadata) {
    const edition = item.edition
      ? await this.api.getEdition(item.edition)
      : undefined;
    const meEdition = edition?.parent
      ? await this.api.getMasterEdition(edition?.parent)
      : undefined;
    const masterEdition = item.masterEdition
      ? await this.api.getMasterEdition(item.masterEdition)
      : undefined;
    return { edition, meEdition, masterEdition };
  }

  // TODO: enum
  public async artType(item: Metadata): Promise<0 | 1 | 2> {
    const { meEdition, masterEdition } = await this.artEditions(item);
    if (meEdition) {
      return 1;
    }
    if (masterEdition) {
      return 0;
    }
    return 2;
  }

  public async artEditionNumber(item: Metadata) {
    const { edition, meEdition } = await this.artEditions(item);
    return meEdition ? edition?.edition : undefined;
  }

  public async artSupply(item: Metadata) {
    const { meEdition, masterEdition } = await this.artEditions(item);
    return meEdition?.supply || masterEdition?.supply;
  }

  public async artMaxSupply(item: Metadata) {
    const { masterEdition } = await this.artEditions(item);
    return masterEdition?.maxSupply;
  }

  // public async getSafetyDepositBoxesExpected(
  //   manager: Pick<AuctionManager, 'vault' | 'state' | 'key'>,
  // ) {
  //   const vault = await this.api.getVault(manager.vault);
  //   return vault ? getSafetyDepositBoxesExpected(manager, vault) : null;
  // }
}
