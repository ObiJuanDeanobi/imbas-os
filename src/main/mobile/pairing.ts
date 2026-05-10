import { createHash, randomBytes, randomUUID } from 'node:crypto';

export type MobilePairingStatus = 'pending' | 'paired' | 'expired' | 'revoked';
export type MobileSessionScope = 'status.read' | 'events.read' | 'runs.read' | 'runledger.read' | 'lorekeeper.read' | 'approvals.review' | 'capture.write';

export interface MobilePairingChallenge {
  id: string;
  code: string;
  codeHash: string;
  status: MobilePairingStatus;
  scopes: MobileSessionScope[];
  createdAt: string;
  expiresAt: string;
  pairedAt?: string;
  deviceLabel?: string;
  sessionTokenHash?: string;
}

export interface MobilePairingPublicChallenge {
  id: string;
  code: string;
  scopes: MobileSessionScope[];
  createdAt: string;
  expiresAt: string;
}

export interface MobileSession {
  id: string;
  challengeId: string;
  deviceLabel: string;
  scopes: MobileSessionScope[];
  tokenHash: string;
  createdAt: string;
  revokedAt?: string;
}

export interface MobilePairingStore {
  challenges: MobilePairingChallenge[];
  sessions: MobileSession[];
  persist?: () => Promise<void>;
}

export interface CreatePairingChallengeOptions {
  scopes?: MobileSessionScope[];
  ttlMs?: number;
  now?: Date;
}

export interface CompletePairingOptions {
  challengeId: string;
  code: string;
  deviceLabel: string;
  now?: Date;
}

export interface CompletedPairing {
  session: MobileSession;
  token: string;
}

export const DEFAULT_MOBILE_SCOPES: MobileSessionScope[] = ['status.read', 'events.read', 'runs.read', 'runledger.read', 'lorekeeper.read', 'approvals.review', 'capture.write'];

export function createMobilePairingStore(): MobilePairingStore {
  return { challenges: [], sessions: [] };
}

export async function createPairingChallenge(store: MobilePairingStore, options: CreatePairingChallengeOptions = {}): Promise<MobilePairingPublicChallenge> {
  const now = options.now ?? new Date();
  const code = randomPairingCode();
  const challenge: MobilePairingChallenge = {
    id: `pair_${randomUUID()}`,
    code,
    codeHash: hashSecret(code),
    status: 'pending',
    scopes: options.scopes ?? DEFAULT_MOBILE_SCOPES,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (options.ttlMs ?? 10 * 60 * 1000)).toISOString()
  };
  store.challenges.push(challenge);
  await store.persist?.();
  return publicChallenge(challenge);
}

export async function completePairingChallenge(store: MobilePairingStore, options: CompletePairingOptions): Promise<CompletedPairing> {
  const now = options.now ?? new Date();
  const challenge = store.challenges.find((item) => item.id === options.challengeId);
  if (!challenge) throw new Error('pairing challenge not found');
  refreshPairingStatuses(store, now);
  if (challenge.status !== 'pending') throw new Error(`pairing challenge is ${challenge.status}`);
  if (challenge.codeHash !== hashSecret(options.code)) throw new Error('pairing code is invalid');
  const token = `imbas_mobile_${randomBytes(32).toString('base64url')}`;
  const session: MobileSession = {
    id: `mobile_${randomUUID()}`,
    challengeId: challenge.id,
    deviceLabel: cleanDeviceLabel(options.deviceLabel),
    scopes: challenge.scopes,
    tokenHash: hashSecret(token),
    createdAt: now.toISOString()
  };
  challenge.status = 'paired';
  challenge.pairedAt = now.toISOString();
  challenge.deviceLabel = session.deviceLabel;
  challenge.sessionTokenHash = session.tokenHash;
  store.sessions.push(session);
  await store.persist?.();
  return { session, token };
}

export async function revokeMobileSession(store: MobilePairingStore, sessionId: string, now = new Date()): Promise<MobileSession> {
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('mobile session not found');
  session.revokedAt = now.toISOString();
  await store.persist?.();
  return session;
}

export function authenticateMobileSession(store: MobilePairingStore, token: string, requiredScope: MobileSessionScope): MobileSession | null {
  const tokenHash = hashSecret(token);
  const session = store.sessions.find((item) => item.tokenHash === tokenHash && !item.revokedAt);
  if (!session) return null;
  return session.scopes.includes(requiredScope) ? session : null;
}

export function refreshPairingStatuses(store: MobilePairingStore, now = new Date()): void {
  for (const challenge of store.challenges) {
    if (challenge.status === 'pending' && new Date(challenge.expiresAt).getTime() <= now.getTime()) challenge.status = 'expired';
  }
}

export function publicChallenge(challenge: MobilePairingChallenge): MobilePairingPublicChallenge {
  return { id: challenge.id, code: challenge.code, scopes: challenge.scopes, createdAt: challenge.createdAt, expiresAt: challenge.expiresAt };
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomPairingCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, '0');
}

function cleanDeviceLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Android companion';
}
