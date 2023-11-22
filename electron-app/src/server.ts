import express from "express";
import { constants } from "fs";
import fs from "fs/promises";
import http from "http";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const basePath = `${os.homedir()}/.nuclia`;
console.log("basePath", basePath);

const defaultConfig = {
  syncPeriod: 3600, // In seconds
};

async function createFile(
  path: string,
  content: string | Uint8Array
): Promise<void> {
  try {
    await fs.writeFile(path, content);
    console.log(`File created at ${path}`);
  } catch (error) {
    console.error("Error creating file:", error);
  }
}

async function createDirectory(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true });
    console.log(`Directory created at ${path}`);
  } catch (error) {
    console.error("Error creating directory:", error);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findFilesInDirectory(
  directory: string,
  extensions: string[]
): Promise<string[]> {
  let result: string[] = [];

  async function walk(currentPath: string) {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        await walk(path.join(currentPath, item.name));
      } else {
        if (extensions.some((ext) => item.name.endsWith(ext))) {
          result.push(path.join(currentPath, item.name));
        }
      }
    }
  }

  await walk(directory);
  return result;
}

const appExpress = express();
let server: http.Server;

appExpress.use(express.json());

appExpress.get("/", async (_req, res) => {
  let result: string[] = [];

  if (!(await pathExists(basePath))) {
    res.status(404).send("Nuclia folder does not exist");
  } else {
    result = await findFilesInDirectory(basePath, [".json"]);
    res.status(200).send(
      JSON.stringify({
        result: result,
      })
    );
  }
});

appExpress.get("/status", async (_req, res) => {
  res.status(200).send("Server is running");
});

appExpress.get("/sources", async (_req, res) => {
  const data = await fs.readFile(`${basePath}/sources.json`, "utf8");
  res.status(200).send(JSON.parse(data));
});

appExpress.post("/sources", async (req, res) => {
  const dataNewSource = req.body;
  const uuid = uuidv4();

  const currentSources = JSON.parse(
    await fs.readFile(`${basePath}/sources.json`, "utf8")
  );
  const sourceAlreadyExists = uuid in currentSources;
  if (sourceAlreadyExists) {
    res
      .status(409)
      .send({ reason: `Source with id ${dataNewSource.id} already exists` });
    return;
  }
  currentSources[uuid] = dataNewSource;
  await fs.writeFile(
    `${basePath}/sources.json`,
    JSON.stringify(currentSources, null, 2)
  );

  res.status(201).send({
    id: dataNewSource.id,
  });
});

appExpress.get("/source/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const currentSources = JSON.parse(
      await fs.readFile(`${basePath}/sources.json`, "utf8")
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

appExpress.patch("/source/:id", async (req, res) => {
  const { id } = req.params;
  const dataNewSource = req.body;
  try {
    const currentSources = JSON.parse(
      await fs.readFile(`${basePath}/sources.json`, "utf8")
    );
    if (!(id in currentSources)) {
      res.status(404).send(null);
    } else {
      currentSources[id] = {
        ...currentSources[id],
        ...dataNewSource,
      };

      await fs.writeFile(
        `${basePath}/sources.json`,
        JSON.stringify(currentSources, null, 2)
      );
      res.status(200).send(null);
    }
  } catch (error) {
    console.error(error);
    res.status(404).send(null);
  }
});

appExpress.delete("/source/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const currentSources = JSON.parse(
      await fs.readFile(`${basePath}/sources.json`, "utf8")
    );
    if (!(id in currentSources)) {
      res.status(404).send(null);
    } else {
      delete currentSources[id];
      await fs.writeFile(
        `${basePath}/sources.json`,
        JSON.stringify(currentSources, null, 2)
      );
      res.status(200).send(null);
    }
  } catch (error) {
    console.error(error);
    res.status(404).send(null);
  }
});

appExpress.post("/stop", async (_req, res) => {
  stopToListen();
  res.status(200).send(null);
});

appExpress.patch("/config/:paramKey", async (req, res) => {
  try {
    const { paramKey } = req.params;
    const { value } = req.body;
    const data = await fs.readFile(`${basePath}/config.json`, "utf8");
    const configData = JSON.parse(data);
    if (paramKey in configData) {
      configData[paramKey] = value;
      await fs.writeFile(
        `${basePath}/config.json`,
        JSON.stringify(configData, null, 2)
      );
      res.status(204).send(null);
    } else {
      res.status(412).send({
        reason: `Parameter ${paramKey} does not exist in config file`,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(null);
  }
});

export async function startToListen(callback?: () => void) {
  if (!(await pathExists(basePath))) {
    await createDirectory(basePath);
  }

  if (!(await pathExists(`${basePath}/sources`))) {
    await createDirectory(`${basePath}/sources`);
  }

  const configPath = `${basePath}/config.json`;
  if (!(await pathExists(configPath))) {
    await createFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  const sourcesPath = `${basePath}/sources.json`;
  if (!(await pathExists(sourcesPath))) {
    await createFile(sourcesPath, JSON.stringify({}, null, 2));
  }

  if (server && server.listening) {
    console.log("Process is already running.");
    return;
  }
  console.log("Start process");
  server = appExpress.listen(8000);
  if (callback) {
    callback();
  }
}

export function stopToListen(callback?: () => void) {
  if (server && server.listening) {
    console.log("Stop process");
    server.close();
    if (callback) {
      callback();
    }
    return;
  }
  console.log("Process is not running.");
}
