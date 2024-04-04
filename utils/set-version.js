const fs = require('fs');
function replaceStringInFile(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf8');
  const version0 = /"version": "0\.0\.0"/;
  const firstPass = content.replace(version0, `"version": "${version}"`);
  const version9 = /99999\.99999\.99999/;
  const secondPass = firstPass.replace(version9, version);
  fs.writeFileSync(filePath, secondPass, 'utf8');
}

const filePath = process.argv[2];
const version = process.argv[3];
replaceStringInFile(filePath, version);
