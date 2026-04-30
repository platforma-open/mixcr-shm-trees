import { test } from 'vitest';
import { TestHelpers } from '@milaboratories/pl-client';
import { MiddleLayer } from '@milaboratories/pl-middle-layer';
import { blockSpec as myBlockSpec } from 'this-block';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// End-to-end test against a (possibly remote) pl server.
//
// Connection is configured via env vars (or test_config.json):
//   PL_ADDRESS, PL_TEST_USER, PL_TEST_PASSWORD
//
// Uses pl-client 3.x + pl-middle-layer 1.55.x directly so the project ends
// up on the same client root the latest Platforma Desktop reads.

// How to run test:
//cd test
//PL_ADDRESS='https://adress' \
//  PL_TEST_USER=user PL_TEST_PASSWORD=... \
//  npx vitest run src/remote-smoke.test.ts


const SOURCE_PROJECT_LABEL = 'Your project [golden]';
const DONOR_LABEL_MATCH = 'Sample';
const DATASET_LABEL_MATCH = 'MiXCR Clonesets';

type Option = { ref: unknown; label: string };

/**
 * Returns the same localSecret the Platforma Desktop persists in its userData
 * `db.json`. Required so dev-v2 block frontend paths signed by this test can
 * be verified by the desktop (otherwise: "Frontend path signature mismatch").
 *
 * Override with PL_LOCAL_SECRET env var if needed.
 */
function getDesktopLocalSecret(): string | undefined {
  if (process.env.PL_LOCAL_SECRET) return process.env.PL_LOCAL_SECRET;

  const home = os.homedir();
  const candidates = [
    path.join(home, '.config/<your_path>'), // Linux
    path.join(home, 'Library/<your_path>'), // macOS
    process.env.APPDATA ? path.join(process.env.APPDATA, '<your_path>') : '' // Windows
  ].filter(Boolean);

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const secret = (JSON.parse(fs.readFileSync(p, 'utf-8')) as { localSecret?: string })
        .localSecret;
      if (secret) {
        console.log(`using desktop localSecret from ${p}`);
        return secret;
      }
    } catch {
      // ignore unparseable files
    }
  }
  return undefined;
}

async function pollForOptions(
  blockState: { awaitStableValue(t: number): Promise<unknown> },
  selector: (outputs: any) => Option[] | undefined,
  timeoutMs: number
): Promise<Option[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const remaining = timeoutMs - (Date.now() - start);
      const stable: any = await blockState.awaitStableValue(Math.min(15_000, remaining));
      const opts = selector(stable?.outputs);
      if (opts && opts.length > 0) return opts;
    } catch {
      // awaitStableValue timeout — loop and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('options did not materialize within timeout');
}

test('VDJ golden -> SHM trees pipeline', { timeout: 900_000 }, async () => {
  // 1. Connect.
  const pl = await TestHelpers.getTestClient();
  console.log('connected. clientRoot =', pl.clientRoot);

  const tmpFolder = path.resolve(`work/${randomUUID()}`);
  await fsp.mkdir(path.join(tmpFolder, 'frontend'), { recursive: true });
  await fsp.mkdir(path.join(tmpFolder, 'download'), { recursive: true });

  const localSecret = getDesktopLocalSecret() ?? MiddleLayer.generateLocalSecret();
  if (!getDesktopLocalSecret()) {
    console.warn(
      'No desktop localSecret found — dev-v2 block frontends will fail to load in the desktop with "Frontend path signature mismatch".'
    );
  }

  const ml = await MiddleLayer.init(pl, tmpFolder, {
    defaultTreeOptions: { pollingInterval: 250, stopPollingDelay: 500 },
    devBlockUpdateRecheckInterval: 300,
    localSecret,
    localProjections: [],
    openFileDialogCallback: () => {
      throw new Error('Not implemented.');
    }
  });
  ml.addRuntimeCapability('requiresUIAPIVersion', 1);
  ml.addRuntimeCapability('requiresUIAPIVersion', 2);
  ml.addRuntimeCapability('requiresUIAPIVersion', 3);

  // 2. Find + duplicate source project.
  const projects = await ml.projectList.getValue();
  const source = projects?.find((p) => p.meta.label === SOURCE_PROJECT_LABEL);
  if (!source) {
    const labels = (projects ?? []).map((p) => p.meta.label);
    throw new Error(
      `Project "${SOURCE_PROJECT_LABEL}" not found. Available: ${JSON.stringify(labels)}`
    );
  }
  const newLabel = `VDJ copy SHM ${new Date().toISOString()}`;
  const newProjectListId = randomUUID();
  const newRid = await ml.duplicateProject(source.rid, () => newLabel, newProjectListId);
  console.log(`duplicated -> "${newLabel}" rid=${newRid} listId=${newProjectListId}`);

  let success = false;
  try {
  // 3. Open + add the block under test.
  await ml.openProject(newRid);
  const project = ml.getOpenedProject(newRid);
  const blockId = await project.addBlock('MiXCR SHM Trees', myBlockSpec);
  console.log(`added block: ${blockId}`);

  const blockState = project.getBlockState(blockId);

  // 4a. Wait for donorOptions, pick by label, set donorColumn.
  const donorOptions = await pollForOptions(
    blockState,
    (o) => o?.donorOptions?.value,
    60_000
  );
  const donorOpt = donorOptions.find((o) => o.label.includes(DONOR_LABEL_MATCH));
  if (!donorOpt) {
    throw new Error(
      `Donor "${DONOR_LABEL_MATCH}" not found. Available: ${JSON.stringify(donorOptions.map((o) => o.label))}`
    );
  }
  console.log(`donor: ${donorOpt.label}`);
  await project.setBlockArgs(blockId, {
    donorColumn: donorOpt.ref,
    datasetColumns: []
  });

  // 4b. Wait for datasetOptions (only computed once donorColumn is set), pick, set.
  const datasetOptions = await pollForOptions(
    blockState,
    (o) => o?.datasetOptions?.value,
    60_000
  );
  const datasetOpt = datasetOptions.find((o) => o.label.includes(DATASET_LABEL_MATCH));
  if (!datasetOpt) {
    throw new Error(
      `Dataset "${DATASET_LABEL_MATCH}" not found. Available: ${JSON.stringify(datasetOptions.map((o) => o.label))}`
    );
  }
  console.log(`dataset: ${datasetOpt.label}`);
  await project.setBlockArgs(blockId, {
    donorColumn: donorOpt.ref,
    datasetColumns: [datasetOpt.ref]
  });

  // 5. Run.
  await project.runBlock(blockId);
  console.log('runBlock issued, waiting for done...');

  // 6+7. Wait for finish, throw on any block error.
  const overview = project.overview;
  const doneSignal = AbortSignal.timeout(800_000);
  while (true) {
    const snap = await overview.getValue();
    const bo = snap?.blocks.find((b) => b.id === blockId);
    if (!bo) throw new Error(`Block ${blockId} disappeared from overview`);
    if (bo.outputErrors) {
      throw new Error(`Block error: ${bo.outputsError ?? bo.exportsError ?? 'no message'}`);
    }
    if (bo.calculationStatus === 'Done') {
      console.log(`block ${blockId} done OK`);
      break;
    }
    if (bo.calculationStatus !== 'Running') {
      throw new Error(`Unexpected calculationStatus: ${bo.calculationStatus}`);
    }
    await overview.awaitChange(doneSignal);
  }

    success = true;
  } finally {
    // 8. On success: delete the duplicated project. On failure: leave it on
    // the server so it can be inspected in the desktop.
    if (success) {
      try {
        await ml.deleteProject(newProjectListId);
        console.log(`test passed — deleted project (listId=${newProjectListId} rid=${newRid})`);
      } catch (err) {
        console.warn(`cleanup failed:`, err);
      }
    } else {
      console.log(`test failed — project preserved on server (listId=${newProjectListId} rid=${newRid})`);
    }
  }
});
