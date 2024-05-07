import compression from 'compression';
import cors from 'cors';
import express from 'express';

export class Server {
  app = express();
  port = 8000;
  routes;

  constructor(options) {
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

    this.serverListener = this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}
