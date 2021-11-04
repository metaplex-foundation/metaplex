import { getEmptyState, MetaState, UpdateStateValueFunc } from '../../common';
import { IWriter } from '../../ingester';
import { PublishFn } from '../../reader';

export class MemoryWriter implements IWriter {
  private readonly state: MetaState = getEmptyState();
  private listenMode = false;
  private publish?: PublishFn;

  constructor(public networkName: string) {}

  async init() {}

  listenModeOn() {
    this.listenMode = true;
  }

  persist: UpdateStateValueFunc = async (prop, key, value) => {
    const a = this.state[prop] as Map<string, typeof value>;
    a.set(key, value);
    if (this.listenMode && this.publish) {
      this.publish(prop, key);
    }
  };

  async flush() {}

  getState() {
    return this.state;
  }

  setPublishFn(publish: PublishFn) {
    this.publish = publish;
  }
}
