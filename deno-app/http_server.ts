import { Request, Response } from "npm:@types/express@4.17.21";
import express from "npm:express@4.18.2";

async function walk(
  path: string,
  callback: ({
    path,
    fileInfo,
  }: {
    path: string;
    fileInfo: Deno.FileInfo;
  }) => void
) {
  const fileInfo = await Deno.lstat(path);
  callback({ fileInfo, path });
  if (fileInfo.isDirectory) {
    const entries = await Deno.readDir(path);
    for await (const entry of entries) {
      await walk(`${path}/${entry.name}`, callback);
    }
  }
}

const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

const app = express();

app.get("/", async (_req: Request, res: Response) => {
  const result: string[] = [];
  if (!(await exists(".nuclia"))) {
    res.status(404).send("Nuclia folder does not exist");
  } else {
    await walk(".nuclia", ({ path, fileInfo }) => {
      result.push(path);
      console.log(`${path}: ${fileInfo.size}`);
    });
    res.send(
      JSON.stringify({
        result: result,
      })
    );
  }
});

app.post("/init", async (_req: Request, res: Response) => {
  console.log("init");
  if (!(await exists(".nuclia"))) {
    await Deno.mkdir(".nuclia");
    const encoder = new TextEncoder();
    const data = encoder.encode("Hello world\n");
    await Deno.writeFile(".nuclia/hello1.txt", data);
    res.status(201).send(null);
  } else {
    res.status(412).send("Nuclia folder already exists");
  }
});

app.listen(8000);
