import { Router } from "express";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { pathExists } from "../../fileSystemFn";

export class SourceFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRoutes(): Router {
    const router = Router();

    router.use("/", async (_req, res, next) => {
      if (!(await pathExists(`${this.basePath}/sources.json`))) {
        res.status(404).send({ error: "Nuclia folder not found" });
        return;
      }
      next();
    });

    router.get("/", async (_req, res) => {
      const data = await fs.readFile(`${this.basePath}/sources.json`, "utf8");
      res.status(200).send(JSON.parse(data));
    });

    router.post("/", async (req, res) => {
      const dataNewSource = req.body;
      const uuid = uuidv4();

      const currentSources = JSON.parse(
        await fs.readFile(`${this.basePath}/sources.json`, "utf8")
      );
      const sourceAlreadyExists = uuid in currentSources;
      if (sourceAlreadyExists) {
        res.status(409).send({
          reason: `Source with id ${dataNewSource.id} already exists`,
        });
        return;
      }
      currentSources[uuid] = dataNewSource;
      await fs.writeFile(
        `${this.basePath}/sources.json`,
        JSON.stringify(currentSources, null, 2)
      );

      res.status(201).send({
        id: dataNewSource.id,
      });
    });

    router.get("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const currentSources = JSON.parse(
          await fs.readFile(`${this.basePath}/sources.json`, "utf8")
        );
        if (!(id in currentSources)) {
          res.status(404).send(null);
        } else {
          res.status(200).send(currentSources[id]);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    router.patch("/:id", async (req, res) => {
      const { id } = req.params;
      const dataNewSource = req.body;
      try {
        const currentSources = JSON.parse(
          await fs.readFile(`${this.basePath}/sources.json`, "utf8")
        );
        if (!(id in currentSources)) {
          res.status(404).send(null);
        } else {
          currentSources[id] = {
            ...currentSources[id],
            ...dataNewSource,
          };

          await fs.writeFile(
            `${this.basePath}/sources.json`,
            JSON.stringify(currentSources, null, 2)
          );
          res.status(204).send(null);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const currentSources = JSON.parse(
          await fs.readFile(`${this.basePath}/sources.json`, "utf8")
        );
        if (!(id in currentSources)) {
          res.status(404).send(null);
        } else {
          delete currentSources[id];
          await fs.writeFile(
            `${this.basePath}/sources.json`,
            JSON.stringify(currentSources, null, 2)
          );
          res.status(200).send(null);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    return router;
  }
}
