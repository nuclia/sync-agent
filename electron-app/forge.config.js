module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'public/logo.*',
    name: 'Nuclia sync',
    executableName: 'nuclia-sync-agent',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: 'https://storage.googleapis.com/iskra/logo.ico',
        setupExe: 'Nuclia-Sync-Setup.exe',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'public/logo.png',
          productName: 'Nuclia sync agent',
        },
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'nuclia',
          name: 'sync-agent',
        },
        draft: true,
      },
    },
  ],
};
