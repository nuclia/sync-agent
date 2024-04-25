import { catchError, from, map, Observable, of } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import * as cheerio from 'cheerio';
import { TO_BE_CHECKED } from '../../../sync/domain/sync.entity';

interface RSSItem {
  link: string;
  pubDate: string;
}

async function fetchRSS(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return response.text();
  } catch (error) {
    console.error('Error fetching RSS feed', error);
    return Promise.resolve('');
  }
}

export function parseRSS(rss: string): RSSItem[] {
  const $ = cheerio.load(rss, { xml: true });
  return $('item')
    .toArray()
    .map((item) => {
      const date = new Date($(item).find('pubDate').text());
      const validDate = !Number.isNaN(date.getDate());
      return {
        link: $(item).find('link').text(),
        pubDate: validDate ? date.toISOString() : '',
      };
    })
    .filter((item) => item.link && item.pubDate);
}

export const RSSConnector: SourceConnectorDefinition = {
  id: 'rss',
  factory: () => new RSSImpl(),
};

class RSSImpl implements IConnector {
  isExternal = true;
  params: ConnectorParameters = {};

  hasAuthData(): boolean {
    return true;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters): boolean {
    return !!params?.url;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  getFolders(): Observable<SearchResults> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _getFiles(query?: string): Observable<SearchResults> {
    const url = this.params['url'];

    return from(fetchRSS(url)).pipe(
      map((content) => parseRSS(content)),
      map((items) => ({
        items: items.map((item) => ({
          title: item.link,
          status: FileStatus.PENDING,
          uuid: `${new Date().getTime()}`,
          originalId: item.link,
          mimeType: TO_BE_CHECKED,
          modifiedGMT: item.pubDate,
          metadata: {
            uri: item.link,
          },
        })),
      })),
      catchError((err) => of({ items: [], error: `Error fetching RSS feed: ${err}` })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  download(resource: SyncItem): Observable<Blob | undefined> {
    throw new Error('Method "download" not implemented.');
  }

  getLink(resource: SyncItem): Observable<Link> {
    return of({
      uri: resource.metadata['uri'],
      extra_headers: {},
      cssSelector: this.getParameters().cssSelector,
      xpathSelector: this.getParameters().xpathSelector,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    return this._getFiles();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastModified(since: string, folders?: SyncItem[], existings?: string[]): Observable<SearchResults> {
    // we do not manage deletions in this connectors as RSS will only push recent items
    return this._getFiles().pipe(
      map((searchResults) => ({
        ...searchResults,
        items: searchResults.items.filter((item) => item.modifiedGMT && item.modifiedGMT > since),
      })),
    );
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }
}
