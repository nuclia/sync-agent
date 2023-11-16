import { parse } from "https://deno.land/std@0.202.0/flags/mod.ts";
import SysTray, { MenuItem } from "https://deno.land/x/systray@v0.3.0/mod.ts";
import { Server } from "node:http";
import { Express, Request, Response } from "npm:@types/express@4.17.21";
import express from "npm:express@4.18.2";

const flags = parse(Deno.args, {
  boolean: ["help", "start"],
  default: { start: false },
});

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

const app: Express = express();
let server: Server;

console.log(flags);

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

interface MenuItemClickable extends MenuItem {
  click?: () => void;
  items?: MenuItemClickable[];
}
const ItemStatusServer: MenuItemClickable = {
  title: flags.start ? "Server is running" : "Sever is stopped",
  tooltip: "Server status",
  enabled: false,
};

const ItemServer: MenuItemClickable = {
  title: flags.start ? "Stop Server" : "Start Server",
  tooltip: flags.start ? "Stop the Server" : "Start the server",
  enabled: true,
  click: () => {
    if (server && server.listening) {
      ItemServer.title = "Start Server";
      ItemServer.tooltip = "Start the Server";
      ItemStatusServer.title = "Server is stopped";

      console.log("Stop the server");
      server.close();
    } else {
      ItemServer.title = "Stop Server";
      ItemServer.tooltip = "Stop the Server";
      ItemStatusServer.title = "Server is running";

      console.log("Start the server");
      server = app.listen(8000);
    }

    systray.sendAction({
      type: "update-item",
      item: ItemServer,
    });
    systray.sendAction({
      type: "update-item",
      item: ItemStatusServer,
    });
  },
};

const ItemExit = {
  title: "Exit",
  tooltip: "Exit the menu",
  checked: false,
  enabled: true,
  click: () => {
    systray.kill();
  },
};

const systray = new SysTray({
  menu: {
    // Use .png icon in macOS/Linux and .ico format in windows
    icon: Deno.build.os === "windows" ? "./icon.ico" : "./icon.png",
    // A template icon is a transparency mask that will appear to be dark in light mode and light in dark mode
    isTemplateIcon: Deno.build.os === "darwin",
    title: "",
    tooltip: "Tooltip",
    items: [
      ItemServer,
      ItemStatusServer,
      SysTray.separator, // SysTray.separator is equivalent to a MenuItem with "title" equals "<SEPARATOR>"
      ItemExit,
    ],
  },
  debug: true, // log actions
  directory: "bin", // cache directory of binary package
});

if (flags.start) {
  server = app.listen(8000);
}

systray.on("click", (action) => {
  const item: MenuItemClickable = action.item;
  if (item.click) {
    item.click();
  }
});

systray.on("ready", () => {
  console.log("tray started!");
});

systray.on("exit", () => {
  console.log("exited");
});

systray.on("error", (error) => {
  console.log(error);
});
