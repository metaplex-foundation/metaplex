import { ObjectId } from 'mongodb';

export const ObjectIdConverter = {
  afterSerialize(data?: ObjectId) {
    return data?.toHexString();
  },
  beforeDeserialize(val?: string) {
    return val ? new ObjectId(val) : null;
  },
};
