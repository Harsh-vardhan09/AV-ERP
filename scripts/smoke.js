// Launcher for smoke.sh. On Windows, PATH `bash` is the WSL shim
// (System32\bash.exe), which has no distro — find Git Bash instead.
const { spawnSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT = path.join(__dirname, 'smoke.sh');

const isWslShim = (p) => /system32[\\/]bash\.exe$/i.test(p)
  || /WindowsApps[\\/]bash\.exe$/i.test(p);

function gitBashFromGitExe() {
  try {
    // git --exec-path -> <root>/mingw64/libexec/git-core; bash lives at <root>/bin
    const execPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
    let dir = execPath.replace(/\//g, path.sep);
    for (let i = 0; i < 5 && dir; i++) {
      const candidate = path.join(dir, 'bin', 'bash.exe');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // git not on PATH; fall through to the fixed candidates
  }
  return null;
}

function findBash() {
  if (process.platform !== 'win32') return 'bash';
  if (process.env.SMOKE_BASH) return process.env.SMOKE_BASH;

  const candidates = [
    gitBashFromGitExe(),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (!isWslShim(c) && fs.existsSync(c)) return c;
  }
  return null;
}

const bash = findBash();

if (!bash) {
  console.error('Could not find a usable bash.');
  console.error('Install Git for Windows, or set SMOKE_BASH to a bash.exe path.');
  console.error('The `bash` on PATH is the WSL shim and cannot run this script.');
  process.exit(1);
}

const result = spawnSync(bash, [SCRIPT], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

if (result.error) {
  console.error(`Failed to run ${bash}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
