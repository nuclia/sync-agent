import { describe, expect, test } from 'vitest';
import { getConnector } from '../../factory';

const folderTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  sourceConnector: async ({}, use) => {
    const connectorDefinition = getConnector('folder');
    const sourceConnector = connectorDefinition.factory();
    await use(sourceConnector);
  },
});

describe('Test validate folder params', () => {
  folderTest('Incorrect - Without params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({})).toBe(false);
  });
  folderTest('Incorrect - With wrong params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
      }),
    ).toBe(false);
  });

  folderTest('Incorrect - With empty params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        path: '',
      }),
    ).toBe(false);
  });

  folderTest('Correct - With correct params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        path: 'test',
      }),
    ).toBe(true);
  });
});
