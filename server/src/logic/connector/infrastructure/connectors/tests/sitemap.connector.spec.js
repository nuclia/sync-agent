import { describe, expect, test } from 'vitest';
import { getConnector } from '../../factory';
import { parseSitemap } from '../sitemap.connector';
import { SITEMAP_SAMPLE } from './sitemap-data';

const sitemapTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  sourceConnector: async ({}, use) => {
    const connectorDefinition = getConnector('sitemap');
    const sourceConnector = connectorDefinition.factory();
    await use(sourceConnector);
  },
});

describe('Test validate sitemap params', () => {
  sitemapTest('Incorrect - Without params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({})).toBe(false);
  });
  sitemapTest('Incorrect - With wrong params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
      }),
    ).toBe(false);
  });

  sitemapTest('Incorrect - With empty params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        sitemap: '',
      }),
    ).toBe(false);
  });

  sitemapTest('Correct - With correct params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        sitemap: 'http://somewhere/test.xml',
      }),
    ).toBe(true);
  });
});

describe('Test sitemap parser', () => {
  test('Should parse the sitemap format', () => {
    parseSitemap(SITEMAP_SAMPLE).then((result) => {
      expect(result).toEqual([
        {
          lastmod: '2024-01-18T16:18:29+00:00',
          loc: 'https://nuclia.com/ai/how-to-use-ai-search-copilots-to-enhance-business-efficiency/',
        },
        {
          lastmod: '2023-12-27T19:30:58+00:00',
          loc: 'https://nuclia.com/developers/rag-as-a-service-with-nuclia-ai-search-api/',
        },
        {
          lastmod: '2023-12-21T09:33:08+00:00',
          loc: 'https://nuclia.com/day-in-the-life/day-in-the-life-eric-brehault-front-end-developer/',
        },
      ]);
    });
  });
});
