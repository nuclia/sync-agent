# Progress Agentic RAG Sync Agent server

The Progress Agentic RAG Sync Agent server is NodeJS application that runs on your server and keeps your files in sync with the Progress Agentic RAG cloud.

## Usage

To install and run the Progress Agentic RAG Sync Agent server, run the following commands:

```bash
npm install -g @nuclia/sync-agent
nuclia-sync-agent
```

## Note

The Progress Agentic RAG Sync Agent stores the configuration and the files in the `.nuclia/sync.json` file.

To sync a root folder, we use a specific format:

```json
{
  "uuid": "",
  "originalId": "/"
}
```
