import { Observable, from, map, of } from 'rxjs';
import { ConnectorParameters } from '../../domain/connector';

export class OAuthBaseConnector {
  params: ConnectorParameters = {};
  refreshAuthentication(): Observable<boolean> {
    if (!this.params.refresh) {
      this.params.token = '';
      this.params.refresh = '';
      return of(false);
    } else {
      return from(
        fetch(`${this.params.refresh_endpoint}?refresh_token=${this.params.refresh}`, {
          method: 'GET',
          headers: {
            origin: 'http://localhost:4200/',
          },
        }).then((res) => res.json()),
      ).pipe(
        map((res) => {
          if (res.token) {
            this.params.token = res.token;
            return true;
          } else {
            this.params.token = '';
            this.params.refresh = '';
            return false;
          }
        }),
      );
    }
  }
}
