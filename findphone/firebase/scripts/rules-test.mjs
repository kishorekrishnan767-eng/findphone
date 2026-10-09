// Runs the rules tests inside `firebase emulators:exec`, and cleans up after it on Windows.
//
// Why this wrapper exists: on Windows, firebase-tools stops the shell that launched the Firestore
// emulator but not the Java process inside it, so every run leaves an orphaned emulator holding the
// port and the next run fails with "port taken". Before and after each run we stop a process on
// the emulator port only if its command line identifies it as the Firestore emulator. Anything
// else on that port is reported, never killed. On macOS/Linux the cleanup normally finds nothing.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const firebaseDir = fileURLToPath(new URL('..', import.meta.url));
const config = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
const port = config.emulators?.firestore?.port ?? 8080;
const EMULATOR_MARKER = 'cloud-firestore-emulator';

/** Returns { pid, commandLine } for each process listening on the port. */
function listeners() {
  try {
    if (process.platform === 'win32') {
      const ps =
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
        `ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" } | ` +
        `ForEach-Object { "$($_.ProcessId)\`t$($_.CommandLine)" }`;
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
      return parse(out);
    }
    const pids = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim().split('\n');
    return pids.filter(Boolean).map((pid) => ({
      pid: Number(pid),
      commandLine: execFileSync('ps', ['-o', 'command=', '-p', pid], { encoding: 'utf8' }).trim(),
    }));
  } catch {
    return []; // lsof exits 1 when nothing listens; treat any lookup failure as "nothing to clean".
  }
}

function parse(out) {
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [pid, ...rest] = line.split('\t');
      return { pid: Number(pid), commandLine: rest.join('\t') };
    });
}

function clearOrphanedEmulator(when) {
  for (const { pid, commandLine } of listeners()) {
    if (commandLine.includes(EMULATOR_MARKER)) {
      process.kill(pid, 'SIGKILL');
      console.log(`[rules-test] ${when}: stopped leftover Firestore emulator (pid ${pid}) on port ${port}`);
    } else {
      console.error(`[rules-test] Port ${port} is used by another program (pid ${pid}); not touching it.`);
      process.exit(1);
    }
  }
}

clearOrphanedEmulator('before run');

const result = spawnSync(
  'npx',
  ['firebase', 'emulators:exec', '--only', 'firestore', '--project', 'demo-findphone', '"vitest run"'],
  { cwd: firebaseDir, stdio: 'inherit', shell: true },
);

clearOrphanedEmulator('after run');
process.exit(result.status ?? 1);
