#!/usr/bin/env node

import { program } from 'commander';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import puppeteer from 'puppeteer';

class Server {
  app = express();
  port = 8091;
  browser = undefined;

  constructor(options) {
    const { port } = options;
    this.port = port;
  }

  extractHTML = async (url, cssSelector, xpathSelector, cookies, localstorage, headers) => {
    const page = await this.browser.newPage();
    if (localstorage) {
      try {
        await page.evaluateOnNewDocument((values) => {
          Object.entries(values).forEach(([name, value]) => localStorage.setItem(name, value));
        }, localstorage);
      } catch (error) {
        console.error('Error when setting localstorage', error.message);
        return { html: '', title: '', error: error.message };
      }
    }
    if (headers) {
      try {
        await page.setExtraHTTPHeaders(headers);
      } catch (error) {
        console.error('Error when setting headers', error.message);
        return { html: '', title: '', error: error.message };
      }
    }
    if (cookies) {
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        Object.entries(cookies).forEach(([name, value]) => {
          client.send('Network.setCookie', { name, value, domain: url });
        });
      } catch (error) {
        console.error('Error when setting cookies', error.message);
        return { html: '', title: '', error: error.message };
      }
    }

    try {
      await page.goto(url);
    } catch (error) {
      console.error(`Error when loading ${url}`, error.message);
      return { html: '', title: '', error: error.message };
    }
    await page.setViewport({ width: 1280, height: 1024 });
    const title = await page.title();
    let html = '';
    try {
      if (xpathSelector) {
        html = await page.$eval(`xpath/${xpathSelector}`, (el) => el.innerHTML);
      } else if (cssSelector) {
        html = await page.$eval(cssSelector, (el) => el.innerHTML);
      } else {
        html = await page.content();
      }
    } catch (error) {
      console.error('Error when extracting HTML', error.message);
      return { html: '', title: '', error: error.message };
    }
    return { html, title };
  };

  async start() {
    this.browser = await puppeteer.launch();
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
    this.app.get('/', async (_req, res) => {
      res.status(200).send(JSON.stringify('Server is running'));
    });

    this.app.get('/status', async (_req, res) => {
      res.status(200).send(JSON.stringify({ running: true }));
    });

    this.app.post('/extract', async (req, res) => {
      const { url, cssSelector, xpathSelector, cookies, localstorage, headers } = req.body;
      const data = await this.extractHTML(url, cssSelector, xpathSelector, cookies, localstorage, headers);
      if (data.error) {
        res.status(500).send(JSON.stringify(data));
        return;
      } else {
        res.status(200).send(JSON.stringify(data));
      }
    });

    this.serverListener = this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

program.option('-p, --port <type> <number>', 'Port', '8091').parse();

const options = program.opts();

const server = new Server({
  port: parseInt(options.port),
});
server.start();
