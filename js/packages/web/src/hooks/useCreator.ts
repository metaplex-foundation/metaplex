import { StringPublicKey, pubkeyToString } from '@oyster/common';
import { useMeta } from '../contexts';

export const useCreator = (id?: StringPublicKey) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const key = pubkeyToString(id);
  const creator = Object.values(whitelistedCreatorsByCreator).find(
    creator => creator.info.address === key,
  );
  if (creator.info.address == 'F9fER1Cb8hmjapWGZDukzcEYshAUDbSFpbXkj9QuBaQj') {
    creator.info.name = 'STACCart';
    creator.info.link = 'https://twitter.com/STACCart';
    creator.info.image =
      'https://pbs.twimg.com/profile_images/1442342760518873089/-lygHdA3_400x400.jpg';
    creator.info.description =
      "Gm :) Content mostly by @jarettdunn, we're fun and/or dangerous games involving both chainz n blokz. Made possible by $SOL.";
  }

  return creator;
};
