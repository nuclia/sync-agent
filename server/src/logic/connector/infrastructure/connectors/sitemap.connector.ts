import { from, map, Observable, of, switchMap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import * as cheerio from 'cheerio';

interface SiteMapModel {
  loc: string;
  lastmod: string;
}

async function fetchSitemap(url: string): Promise<string> {
  const response = await fetch(url);
  // TODO: control whether it is zipped or plain
  return response.text();
}

export function parseSitemap(sitemapContent: string): Promise<SiteMapModel[]> {
  return new Promise((resolve) => {
    const urls: SiteMapModel[] = [];
    const $ = cheerio.load(sitemapContent, { xml: true });

    $('url').each((_, element) => {
      const loc = $(element).find('loc').text();
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
  getFiles(query?: string | undefined): Observable<SearchResults> {
    const sitemapUrl = this.params['sitemap'];

    return this._getSiteMap(sitemapUrl).pipe(
      map((parsedUrls) => ({
        items: parsedUrls.map((parsedUrl) => ({
          title: parsedUrl.loc,
          status: FileStatus.PENDING,
          uuid: `${new Date().getTime()}`,
          originalId: parsedUrl.loc,
          metadata: {
            uri: parsedUrl.loc,
            path: parsedUrl.loc.replace(/https?:\/\//, ''),
            lastModified: parsedUrl.lastmod,
          },
        })),
      })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  download(resource: SyncItem): Observable<Blob | undefined> {
    throw new Error('Method "download" not implemented.');
  }

  getLink(resource: SyncItem): Observable<Link> {
    const newLink: Link = { uri: resource.metadata['uri'], extra_headers: {} };
    return of(newLink);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    return this.getFiles();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastModified(since: string, folders?: SyncItem[]): Observable<SearchResults> {
    return this.getFiles().pipe(
      map((searchResults) => ({
        ...searchResults,
        items: searchResults.items.filter(
          (item) => !item.metadata['lastModified'] || item.metadata['lastModified'] > since,
        ),
      })),
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
