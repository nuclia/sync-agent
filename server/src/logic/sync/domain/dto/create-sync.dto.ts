import { v4 as uuidv4 } from 'uuid';
import { MakeOptional } from '../../../../types/server';
import { getConnector } from '../../../connector/infrastructure/factory';
import { ISyncEntity, NucliaOptionsValidator } from '../sync.entity';
import { validateZodSchema } from './validate';

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
    const connectorDefinition = getConnector(props.connector?.name || '');
    if (!connectorDefinition) {
      return ['Connector definition is not defined'];
    }

    if (!props.kb) {
      return ['The Knowledge Box info is mandatory'];
    }

    if (props.kb) {
      try {
        validateZodSchema(NucliaOptionsValidator, props.kb);
      } catch (error) {
        return [`Invalid format for kb: ${error}`];
      }
    }

    if (props.foldersToSync) {
      return ['You can not create a sync with foldersToSync'];
    }

    return [undefined, new CreateSyncDto({ ...props, id })];
  }
}
