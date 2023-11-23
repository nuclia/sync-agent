import compression from "compression";
import express, { Router } from "express";
import http from "http";
import { EVENTS, EventEmitter } from "./events/events";

// appExpress.patch("/config/:paramKey", async (req, res) => {
//   try {
//     const { paramKey } = req.params;
//     const { value } = req.body;
//     const data = await fs.readFile(`${basePath}/config.json`, "utf8");
//     const configData = JSON.parse(data);
//     if (paramKey in configData) {
//       configData[paramKey] = value;
//       await fs.writeFile(
//         `${basePath}/config.json`,
//         JSON.stringify(configData, null, 2)
//       );
//       res.status(204).send(null);
//     } else {
//       res.status(412).send({
//         reason: `Parameter ${paramKey} does not exist in config file`,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(400).send(null);
//   }
// });

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
    //* Middlewares
    this.app.use(express.json()); // raw
    this.app.use(express.urlencoded({ extended: true })); // x-www-form-urlencoded
    this.app.use(compression());

    //* Routes
    this.app.use(this.routes);

    this.app.get("/", async (_req, res) => {
      res.status(200).send("Server is running");
    });

    this.app.get("/status", async (_req, res) => {
      res.status(200).send("Server is running");
    });

    this.app.post("/stop", async (_req, res) => {
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
    console.log("Stop server");
    this.serverListener?.close();
    eventEmitter.emit(EVENTS.STOP_LISTENING);
  }
}
