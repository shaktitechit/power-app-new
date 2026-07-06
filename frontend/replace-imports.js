const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDirs = ['app', 'components'];
const replacements = [
  { from: '@\/components\/electrical-audit', to: '@/components/portal/shared/components/electrical-audit' },
  { from: '@\/components\/enquiry', to: '@/components/portal/shared/components/enquiry' },
  { from: '@\/components\/facility', to: '@/components/portal/shared/components/facility' },
  { from: '@\/components\/reports', to: '@/components/portal/shared/components/reports' },
  { from: '@\/components\/user-performance', to: '@/components/portal/shared/components/user-performance' },
  { from: '@\/components\/safety-audit', to: '@/components/portal/shared/components/safety-audit' },
  { from: '@\/components\/font-scale-provider', to: '@/components/portal/shared/components/font-scale-provider' },
  { from: '@\/components\/font-size-control', to: '@/components/portal/shared/components/font-size-control' },
  { from: '@\/components\/mode-toggle', to: '@/components/portal/shared/components/mode-toggle' },
  { from: '@\/components\/presenceBootstrap', to: '@/components/portal/shared/components/presenceBootstrap' },
  { from: '@\/components\/presenceCellStatus', to: '@/components/portal/shared/components/presenceCellStatus' },
  { from: '@\/components\/PresenceIndicator', to: '@/components/portal/shared/components/PresenceIndicator' },
  { from: '@\/components\/theme-provider', to: '@/components/portal/shared/components/theme-provider' },
  { from: '@\/components\/theme-toggle', to: '@/components/portal/shared/components/theme-toggle' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of replacements) {
    const regex = new RegExp(from.replace(/\//g, '\\/'), 'g');
    if (regex.test(content)) {
      content = content.replace(regex, to);
      changed = true;
    }
  }

  // Also fix the specific relative import in dashboard-layout.tsx
  if (filePath.endsWith('dashboard-layout.tsx')) {
      if (content.includes('../../presenceBootstrap')) {
          content = content.replace('../../presenceBootstrap', '../shared/components/presenceBootstrap');
          changed = true;
      }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  }
}

targetDirs.forEach(dir => processDirectory(path.join(__dirname, dir)));
console.log('Done.');
