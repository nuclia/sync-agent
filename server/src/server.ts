import compression from 'compression';
import cors from 'cors';
import express, { Router } from 'express';
import http from 'http';
import { EVENTS, EventEmitter } from './events/events';

interface Options {
  port: number;
  routes: Router;
}
export const eventEmitter = new EventEmitter();

export class Server {
  public readonly app: express.Application = express();
  private readonly port: number = 8000;
  private serverListener?: http.Server;
  private readonly routes: Router;

  constructor(options: Options) {
    const { port, routes } = options;
    this.port = port;
    this.routes = routes;
  }

  async start() {
    //* CORS
    this.app.use(
      cors({
        origin: '*',
      }),
    );
    //* Middlewares
    this.app.use(express.json()); // raw
    this.app.use(express.urlencoded({ extended: true })); // x-www-form-urlencoded
    this.app.use(compression());
    this.app.use((req, res, next) => {
      res.setHeader('Content-Type', 'application/json');
      next();
    });

    //* Routes
    this.app.use(this.routes);

    this.app.get('/', async (_req, res) => {
      res.status(200).send(JSON.stringify('Server is running'));
    });

    this.app.get('/status', async (_req, res) => {
      res.status(200).send(JSON.stringify({ running: true }));
    });

    this.app.post('/stop', async (_req, res) => {
      this.stopServer();
      res.status(200).send(null);
    });

    this.serverListener = this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
    eventEmitter.emit(EVENTS.START_LISTENING);
  }

  public close() {
    this.stopServer();
  }

  private stopServer() {
    console.log('Stop server');
    this.serverListener?.close();
    eventEmitter.emit(EVENTS.STOP_LISTENING);
  }
}
