import { describe, expect, test } from 'vitest';
import { getConnector } from '../../factory';
import { parseRSS } from '../rss.connector';
import { RSS_SAMPLE } from './rss-data';

const rssTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  sourceConnector: async ({}, use) => {
    const connectorDefinition = getConnector('rss');
    const sourceConnector = connectorDefinition.factory();
    await use(sourceConnector);
  },
});

describe('Test validate sitemap params', () => {
  rssTest('Incorrect - Without params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({})).toBe(false);
  });
  rssTest('Incorrect - With wrong params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({ incorrect: 'test' })).toBe(false);
  });

  rssTest('Incorrect - With empty params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({ url: '' })).toBe(false);
  });

  rssTest('Correct - With correct params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({ url: 'http://somewhere/rss.xml' })).toBe(true);
  });
});

describe('Test RSS parser', () => {
  test('Should return empty list if content is invalid', () => {
    expect(parseRSS('Invalid XML')).toEqual([]);
  });
  test('Should parse the RSS format', () => {
    expect(parseRSS(RSS_SAMPLE)).toEqual([
      {
        link: 'https://nuclia.com/developers/how-to-build-generative-ai-search-for-your-data/',
        pubDate: '2024-03-14T12:00:00.000Z',
      },
      {
        link: 'https://nuclia.com/developers/streamline-llm-quality-assurance-for-rag/',
        pubDate: '2024-03-11T09:00:00.000Z',
      },
    ]);
  });
});
