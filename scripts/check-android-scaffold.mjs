import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const requiredFiles = [
  'apps/android/settings.gradle.kts',
  'apps/android/build.gradle.kts',
  'apps/android/app/build.gradle.kts',
  'apps/android/app/src/main/AndroidManifest.xml',
  'apps/android/app/src/main/java/ai/imbas/companion/MainActivity.kt',
  'apps/android/app/src/main/java/ai/imbas/companion/ImbasCompanionContract.kt',
  'apps/android/app/src/main/java/ai/imbas/companion/ImbasApiClient.kt',
  'apps/android/app/src/main/java/ai/imbas/companion/ImbasCompanionScreens.kt'
];
const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`missing Android scaffold files: ${missing.join(', ')}`);
  process.exit(1);
}
const contract = await readFile('apps/android/app/src/main/java/ai/imbas/companion/ImbasCompanionContract.kt', 'utf8');
const client = await readFile('apps/android/app/src/main/java/ai/imbas/companion/ImbasApiClient.kt', 'utf8');
const screens = await readFile('apps/android/app/src/main/java/ai/imbas/companion/ImbasCompanionScreens.kt', 'utf8');
for (const needle of ['ImbasMobileSession', 'ImbasPairingRequest', 'ImbasStatus']) {
  if (!contract.includes(needle)) throw new Error(`contract missing ${needle}`);
}
for (const needle of ['/v0/mobile/pairing-challenges/complete', '/v0/status', '/v0/runledger', '/v0/wiki/proposals']) {
  if (!client.includes(needle)) throw new Error(`client missing ${needle}`);
}
for (const needle of ['PairingScreen', 'AiWorldScreen', 'RunledgerScreen', 'LorekeeperReviewScreen']) {
  if (!screens.includes(needle)) throw new Error(`screens missing ${needle}`);
}
if (/secret:\/\//.test(`${contract}\n${client}\n${screens}`)) throw new Error('Android scaffold must not contain Sanctum secret handles or raw secrets');
console.log('android scaffold check passed');
