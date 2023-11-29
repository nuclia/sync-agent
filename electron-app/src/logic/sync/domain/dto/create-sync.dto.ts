import { v4 as uuidv4 } from 'uuid';
import { MakeOptional } from '../../../../types/server';
import { ISyncEntity } from '../sync.entity';

export class CreateSyncDto {
  private constructor(public readonly options: ISyncEntity) {}

  get values() {
    const returnObj: ISyncEntity = {
      connector: this.options.connector,
      kb: this.options.kb,
      title: this.options.title,
      id: this.options.id,
    };

    if (this.options.labels) returnObj.labels = this.options.labels;

    return returnObj;
  }

  static create(props: MakeOptional<ISyncEntity, 'id'>): [string?, CreateSyncDto?] {
    let { id } = props;
    if (!id) {
      id = uuidv4();
    }
    return [undefined, new CreateSyncDto({ ...props, id })];
  }
}
