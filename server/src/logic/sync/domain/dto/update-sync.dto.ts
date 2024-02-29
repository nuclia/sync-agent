import { SyncItemValidator } from '../../../connector/domain/connector';
import { getConnector } from '../../../connector/infrastructure/factory';
import { ISyncEntity } from '../sync.entity';
import { validateZodSchema } from './validate';

type Values = Partial<ISyncEntity> & { id: string };
export class UpdateSyncDto {
  private constructor(public readonly options: Values) {}

  get values() {
    const returnObj: Values = {
      id: this.options.id,
    };

    if (this.options.connector) returnObj.connector = this.options.connector;
    if (this.options.kb) returnObj.kb = this.options.kb;
    if (this.options.labels) returnObj.labels = this.options.labels;
    if (this.options.title) returnObj.title = this.options.title;
    if (this.options.lastSyncGMT) returnObj.lastSyncGMT = this.options.lastSyncGMT;
    if (this.options.foldersToSync) returnObj.foldersToSync = this.options.foldersToSync;

    return returnObj;
  }

  static create(props: Values): [string?, UpdateSyncDto?] {
    const { id, connector, kb, foldersToSync } = props;

    if (!id) {
      return ['id is mandatory'];
    }
    if (connector) {
      const connectorDefinition = getConnector(connector?.name || '');
      if (!connectorDefinition) {
        return ['Connector definition is not defined'];
      }
      const sourceConnector = connectorDefinition.factory();
      if (!sourceConnector.areParametersValid(connector.parameters)) {
        return [`Connector ${connector.name} parameters are not valid`];
      }
    }

    const isDefined = (value: unknown) => value !== null && value !== undefined;

    if (kb) {
      const { knowledgeBox, backend } = kb;
      if (isDefined(knowledgeBox) && !knowledgeBox) {
        return ['Invalid format for kb: Error: knowledgeBox is required'];
      }
      if (isDefined(backend) && !backend) {
        return ['Invalid format for kb: Error: backend is required'];
      }
    }

    if (foldersToSync && foldersToSync.length > 0) {
      let errorMsg = '';
      const valid = foldersToSync.some((folder) => {
        try {
          validateZodSchema(SyncItemValidator, folder);
          return true;
        } catch (error) {
          errorMsg = `Invalid format for foldersToSync: ${error}`;
        }
      });
      if (!valid) {
        return [errorMsg];
      }
    }

    return [undefined, new UpdateSyncDto(props)];
  }
}
