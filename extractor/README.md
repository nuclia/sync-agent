# Web page extractor

Allows to extract the HTML content of a web page.

## Objective

When pushing regular links to your Progress Agentic RAG Knowledge Box, the content of the page is extracted by the Progress Agentic RAG processing, but your web pages may not be accessible from the internet. This extractor allows you to extract the content of your web pages locally and so the Progress Agentic RAG Sync Agent can push the corresponding content to your Progress Agentic RAG Knowledge Box.

It must be used in conjunction with the [Progress Agentic RAG Sync agent](https://github.com/nuclia/sync-agent).
It must be deployed on the same machine as the Progress Agentic RAG Sync agent, and it runs on port 8091.

## Installation

```bash
npm install @nuclia/extractor
```

## Usage

```bash
npm start
```
