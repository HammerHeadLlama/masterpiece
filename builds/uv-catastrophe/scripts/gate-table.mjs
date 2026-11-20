#!/usr/bin/env node
// Runs the build and the test suite, then rewrites the README gate table from the [gateN] log lines.
// Tolerance and prototype columns quote SPEC.md; the Measured column comes only from this test run.
//
//   npm run readme:gates -- --browser-checked=2026-11-20
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = join(root, 'README.md');
const browserArg = process.argv.find((a) => a.startsWith('--browser-checked='));
const browserChecked = browserArg ? browserArg.split('=')[1] : null;

execSync('npm run build', { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
let out;
try {
  out = execSync('npx vitest run --reporter=verbose', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  process.stdout.write(e.stdout ?? '');
  console.error('Tests failed: README not updated.');
  process.exit(1);
}
const plain = out.replace(/\x1b\[[0-9;]*m/g, '');
const summary = plain.match(/Tests\s+(\d+) passed \((\d+)\)/);
if (!summary || summary[1] !== summary[2] || /\bfailed\b/.test(plain)) {
  console.error('Not every test passed: README not updated.');
  process.exit(1);
}

const logs = {};
for (const m of plain.matchAll(/^\[gate(\d)\] (.*)$/gm)) (logs[m[1]] ??= []).push(m[2].trim());
const need = (g, re) => {
  const line = (logs[g] ?? []).find((l) => re.test(l));
  if (!line) throw new Error(`gate ${g}: no log line matching ${re}`);
  return line.match(re);
};

// Gate 1
const g16 = need(1, /g\[1\.\.6\] = (.*)/)[1];
const n160 = Number(need(1, /N\(160\) = (\d+)/)[1]).toLocaleString('en-US');
// Gate 2
const w20 = need(2, /N\(20\).*= (-?[\d.]+)%/)[1];
const w160 = need(2, /N\(160\).*= (-?[\d.]+)%/)[1];
const s2 = need(2, /slope.*= ([\d.]+)/)[1];
// Gate 3
const e8 = need(3, /x=1e-8 .*= (\S+)/)[1];
const e50 = need(3, /x=50 .*error (\S+)/)[1];
const e800 = need(3, /x=800 .*= (\S+)/)[1];
// Gate 4
const sb = (logs[4] ?? [])
  .map((l) => l.match(/T=(\d+) K .*= (-?[\d.]+)%/))
  .filter(Boolean)
  .map((m) => `${m[1]} K ${Number(m[2]).toFixed(2)}%`);
const s4 = need(4, /slope.*= ([\d.]+)/)[1];
// Gate 5
const fs5 = (logs[5] ?? [])
  .map((l) => l.match(/ε=([\d.]+)\s+measured (-?[\d.]+)\s+predicted (-?[\d.]+)/))
  .filter(Boolean)
  .map((m) => `ε=${m[1]}: ${m[2]} vs ${m[3]}`);
// Gate 6
const g6 = (logs[6] ?? [])
  .map((l) => l.match(/T=(\d+) K\s+(\d+) bins\s+worst (-?[\d.]+)%/))
  .filter(Boolean)
  .map((m) => `${m[1]} K: worst ${m[3]}% (${m[2]} bins)`);
// Gate 7
const g7 = (logs[7] ?? [])
  .map((l) => l.match(/T=(\d+) K\s+λ_max·T (-?[\d.]+)%\s+f_max\/T (-?[\d.]+)%\s+λf\/c ([\d.]+)/))
  .filter(Boolean)
  .map((m) => ({ T: m[1], dl: Number(m[2]), df: Number(m[3]), p: Number(m[4]) }));
const worst = (key) => g7.reduce((a, b) => (Math.abs(b[key]) > Math.abs(a[key]) ? b : a));
const wl = worst('dl');
const wf = worst('df');
const pMin = Math.min(...g7.map((r) => r.p)).toFixed(4);
const pMax = Math.max(...g7.map((r) => r.p)).toFixed(4);
const sign = (v) => (v > 0 ? '+' : '') + v.toFixed(3);

for (const [g, arr, n] of [[4, sb, 5], [5, fs5, 3], [6, g6, 2], [7, g7, 5]]) {
  if (arr.length !== n) throw new Error(`gate ${g}: expected ${n} log lines, got ${arr.length}`);
}

const rows = [
  ['Gate', 'Check', 'Tolerance', 'Spec prototype', 'Measured'],
  ['0', 'build, tests, page', 'succeed; no console errors', 'n/a',
    `build ok; ${summary[1]}/${summary[2]} tests pass; ` +
      (browserChecked ? `console clean (browser check ${browserChecked})` : 'browser check not recorded')],
  ['1', 'mode table g[1..6]; Σg for m ≤ 160²', 'exact', '0, 3, 2, 0, 6, 6; 4,288,591', `${g16}; ${n160}`],
  ['2', 'Weyl: N/(πRc³/3) − 1 at Rc = 20, 160; log-log slope', '< 1%, < 0.1%; 3 ± 0.01', '−0.69%, −0.017%; 3.003', `${w20}%, ${w160}%; ${s2}`],
  ['3', 'Planck limits at x = 1e-8, 50, 800', '1e-12 abs; 1e-12 rel; finite', 'n/a', `${e8}; ${e50}; ${e800}`],
  ['4', 'U_P(160)/(aT⁴V) − 1; slope against T', '< 1%; 4 ± 0.01', 'worst −0.66% (3000 K); 4.005', `${sb.join(', ')}; slope ${s4}`],
  ['5', 'finite-size deficit vs −15ε²/(4π³)', 'within 10% relative', '−0.00127, −0.00464, −0.01023', fs5.join('; ')],
  ['6', 'ΔR = 2 bins vs continuum Planck, x ∈ [1, 10]', '< 2% per bin', '0.8% (5772 K), 0.9% (9500 K)', g6.join('; ')],
  ['7', 'λ_max·T; f_max/T; λ_max·f_max/c over 5 temperatures', '< 1%; < 2%; 0.568 ± 0.015', '+0.33%; +0.92%; n/a',
    `worst ${sign(wl.dl)}% (${wl.T} K); worst ${sign(wf.df)}% (${wf.T} K); ${pMin}–${pMax}`],
];
const table = [
  `| ${rows[0].join(' | ')} |`,
  `|${rows[0].map(() => '---').join('|')}|`,
  ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`),
].join('\n');

const readme = readFileSync(readmePath, 'utf8');
const start = '<!-- gates:start -->';
const end = '<!-- gates:end -->';
const i = readme.indexOf(start);
const j = readme.indexOf(end);
if (i < 0 || j < i) throw new Error('README is missing the gate markers');
writeFileSync(readmePath, `${readme.slice(0, i + start.length)}\n${table}\n${readme.slice(j)}`);
console.log(table);
