// Resolves pnpm `catalog:` version specifiers in artifacts/pixilink-web/package.json
// using the catalog defined in pnpm-workspace.yaml.
// Run from the workspace root: node scripts/docker/resolve-catalog.js
const fs = require('fs');

const yaml = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
const catalog = {};
let inCatalog = false;
for (const line of yaml.split('\n')) {
  if (line.trim() === 'catalog:') { inCatalog = true; continue; }
  if (inCatalog && line && line[0] !== ' ') { inCatalog = false; }
  if (inCatalog) {
    const m = line.match(/^  ['"]?([^'":\s]+)['"]?:\s+(.+)/);
    if (m) catalog[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const pkgPath = 'artifacts/pixilink-web/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let resolved = 0;
for (const section of ['dependencies', 'devDependencies']) {
  for (const key of Object.keys(pkg[section] || {})) {
    if (pkg[section][key] === 'catalog:') {
      pkg[section][key] = catalog[key] || '*';
      resolved++;
    }
  }
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`Resolved ${resolved} catalog: entries using ${Object.keys(catalog).length} catalog definitions.`);
