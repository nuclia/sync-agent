# 1.7.0 (2025-05-21)

- Support extract strategies

# 1.6.1 (2025-02-14)

- Exclude anchor and query strung from URLs in sitemap connector

# 1.6.0 (2025-01-28)

- Support files download when using sitemap connector with local extraction

# 1.5.2 (2024-08-14)

- Electron app: kill previous process when starting a new one

# 1.5.1 (2024-05-28)

- Fix: do not crash if oauth refresh is failing

# 1.5.0 (2024-05-07)

- Supports local extraction of web pages

# 1.4.2 (2024-04-30)

- When loading folders, expose `displayPath` when needed and possible, according the connector types.

# 1.4.1 (2024-04-30)

- Fix titles in sitemap and RSS connectors

# 1.4.0 (2024-04-29)

- Endpoint to execute a unique sync
- Fix filters values update

# 1.3.1 (2024-04-29)

- Fix metadata for files

# 1.3.0 (2024-04-25)

- Support deletion syncing (when a file is deleted in a source, the corresponding resource is deleted in the Nuclia Knowledge Box)

# 1.2.21 (2024-04-18)

- Do not override title on existing resource

# 1.2.20 (2024-04-16)

- Fix metadata for links

# 1.2.19 (2024-04-15)

- Support syncing of the root folder for the different connectors.

# 1.2.18 (2024-04-11)

- Fix: do not send empty headers

# 1.2.17 (2024-04-11)

- Support HTTP headers, cookies and localstorage when uploading links

# 1.2.16 (2024-04-09)

- Sync the security groups

# 1.2.15 (2024-04-05)

- Support XPath selector in sitemap and RSS connectors

# 1.2.13 (2024-04-04)

- Report errors from the different connectors

# 1.2.7 (2024-03-28)

- Fix file type filtering

# 1.2.6 (2024-03-27)

- Fix path when retrieving folders.

# 1.2.5 (2024-03-22)

- Add RSS connector

# 1.2.4 (2024-03-18)

- Support CSS selectors in sitemap component

# 1.2.3 (2024-03-18)

- Allow to activate/deactivate a sync

# 1.2.2 (2024-03-15)

- Check mimetype of the uploaded links to create either a link or a file

# 1.2.1 (2024-03-15)

- Use `checkAuthorization` to validate token

# 1.2.0 (2024-03-13)

- Secure endpoints by validating the dashboard user token

# 1.1.0 (2024-03-11)

- Support filtering options

# 1.0.2 (2024-02-26)

- Fix npm package

# 1.0.1 (2024-02-26)

- Initial release
