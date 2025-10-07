import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import * as cheerio from 'cheerio';
import { TO_BE_CHECKED } from '../../../sync/domain/sync.entity';
import zlib from 'node:zlib';
import fs from 'fs';
import { pipeline, Readable, Writable } from 'node:stream';

interface SiteMapModel {
  loc: string;
  lastmod: string;
}

async function fetchSitemap(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0' },
    });
    if (response.headers.get('content-type') === 'application/x-gzip') {
      const arrbuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrbuf);
      return await unzipSitemap(buffer);
    } else {
      return response.text();
    }
  } catch (error) {
    console.error('Error fetching sitemap', error);
    return Promise.reject('Error fetching sitemap');
  }
}

async function unzipSitemap(buffer: Buffer): Promise<string> {
  const unzip = zlib.createUnzip();
  const readable = new Readable();
  readable._read = () => {}; // _read is required
  readable.push(buffer);
  readable.push(null);
  const chunks: any = [];
  const output = new Writable({
    write: function (chunk, encoding, next) {
      chunks.push(Buffer.from(chunk));
      next();
    },
  });
  return new Promise((resolve, reject) => {
    pipeline(readable, unzip, output, (error) => {
      if (error) {
        reject(error);
      } else {
        output.end();
        resolve(Buffer.concat(chunks).toString('utf8'));
      }
    });
  });
}

export function parseSitemap(sitemapContent: string): Promise<SiteMapModel[]> {
  return new Promise((resolve) => {
    const urls: SiteMapModel[] = [];
    const $ = cheerio.load(sitemapContent, { xml: true });

    $('url').each((_, element) => {
      const loc = $(element).find('loc').text().split('#')[0];
      const lastmod = $(element).find('lastmod').text();
      urls.push({ loc, lastmod });
    });

    const sitemaps = $('sitemap').map((_, element) => {
      const url = $(element).find('loc').text();
      return fetchSitemap(url).then(parseSitemap);
    });

    Promise.all(sitemaps).then((sitemaps) => {
      resolve([...urls, ...sitemaps.flat()]);
    });
  });
}

export const SitemapConnector: SourceConnectorDefinition = {
  id: 'sitemap',
  factory: () => new SitemapImpl(),
};

class SitemapImpl implements IConnector {
  isExternal = true;
  params: ConnectorParameters = {};

  hasAuthData(): boolean {
    return true;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters): boolean {
    return !!params?.sitemap;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  getFolders(): Observable<SearchResults> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _getFiles(query?: string | undefined): Observable<SearchResults> {
    const sitemapUrl = this.params['sitemap'];
    return this._getSiteMap(sitemapUrl).pipe(
      map((parsedUrls) => ({
        items: parsedUrls.map((parsedUrl) => {
          const url = this.params['keepQueryString'] ? parsedUrl.loc : parsedUrl.loc.split('?')[0];
          return {
            title: url,
            status: FileStatus.PENDING,
            uuid: `${new Date().getTime()}`,
            originalId: url,
            mimeType: TO_BE_CHECKED,
            metadata: {
              uri: url,
              path: url.replace(/https?:\/\//, ''),
              lastModified: parsedUrl.lastmod,
            },
          };
        }),
      })),
      catchError((err) => of({ items: [], error: `${err}` })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  download(resource: SyncItem): Observable<Blob | undefined> {
    throw new Error('Method "download" not implemented.');
  }

  getLink(resource: SyncItem): Observable<Link> {
    const newLink: Link = {
      uri: resource.metadata['uri'],
      extra_headers: {},
      cssSelector: this.getParameters().cssSelector,
      xpathSelector: this.getParameters().xpathSelector,
    };
    return of(newLink);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    return this._getFiles();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastModified(since: string, folders?: SyncItem[], existings?: string[]): Observable<SearchResults> {
    return this._getFiles().pipe(
      map((searchResults) => {
        const currentIds = searchResults.items.map((item) => item.originalId);
        const toSync = searchResults.items.filter(
          (item) => !item.metadata['lastModified'] || item.metadata['lastModified'] > since,
        );
        const toDelete = existings?.filter((id) => !currentIds.includes(id)) ?? [];
        return {
          ...searchResults,
          items: [
            ...toSync,
            ...toDelete.map((id) => ({ uuid: id, originalId: id, title: '', metadata: {}, deleted: true })),
          ],
        };
      }),
    );
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }

  private _getSiteMap(url: string): Observable<SiteMapModel[]> {
    return from(fetchSitemap(url)).pipe(switchMap((content) => from(parseSitemap(content))));
  }
}
