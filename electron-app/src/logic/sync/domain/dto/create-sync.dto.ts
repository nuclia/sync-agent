import { v4 as uuidv4 } from 'uuid';
import { MakeOptional } from '../../../../types/server';
import { getConnector } from '../../../connector/infrastructure/factory';
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
    const connectorDefinition = getConnector(props.connector?.name || '');
    if (!connectorDefinition) {
      return ['Connector definition is not defined'];
    }
    const sourceConnector = connectorDefinition.factory();
    if (!sourceConnector.areParametersValid(props.connector.parameters)) {
      return [`Connector ${props.connector.name} parameters are not valid`];
    }

    if (!props.kb) {
      return ['The Knowledge Box info is mandatory'];
    }

    if (props.kb) {
      if (!props.kb.knowledgeBox) {
        return ['knowledgeBox is mandatory'];
      }
      if (!props.kb.zone) {
        return ['zone is mandatory'];
      }
      if (!props.kb.backend) {
        return ['backend is mandatory'];
      }
      if (!props.kb.apiKey) {
        return ['apiKey is mandatory'];
      }
    }

    return [undefined, new CreateSyncDto({ ...props, id })];
  }
}
