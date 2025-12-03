import { describe, expect, test } from 'vitest';
import { getConnector } from '../../factory';

const sitefinityTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  sourceConnector: async ({}, use) => {
    const connectorDefinition = getConnector('sitefinity');
    const sourceConnector = connectorDefinition.factory();
    await use(sourceConnector);
  },
});

describe('Test validate sitefinity params', () => {
  sitefinityTest('Incorrect - Without params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({})).toBe(false);
  });
  sitefinityTest('Incorrect - With wrong params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
      }),
    ).toBe(false);
  });

  sitefinityTest('Incorrect - With empty params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        url: '',
        apikey: '',
      }),
    ).toBe(false);
  });

  sitefinityTest('Correct - With correct params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        url: 'http://somewhere',
        apikey: '123ABC',
        siteId: 'qwerty',
      }),
    ).toBe(true);
  });
});
