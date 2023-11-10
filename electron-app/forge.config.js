module.exports = {
  packagerConfig: {
    asar: true,
    name: "Nuclia sync",
    executableName: "nuclia-sync-agent",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "nuclia",
          name: "sync-agent",
        },
        draft: true,
      },
    },
  ],
};
