import { randomBytes, createCipheriv, createDecipheriv, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { SecretHandle, isSecretHandle } from './secretHandles.js';

const scrypt = promisify(scryptCallback);
const FORMAT_VERSION = 1;

export type SanctumApprovalPolicy = 'never' | 'per_use' | 'session';
export type SanctumAuditDecision = 'allowed' | 'denied';

export interface SanctumSecretInput {
  handle: SecretHandle;
  value: string;
  label?: string;
  allowedConnectors?: string[];
  allowedTools?: string[];
  approval?: SanctumApprovalPolicy;
  expiresAt?: string;
}

export interface SanctumSecretMetadata {
  handle: SecretHandle;
  label?: string;
  allowedConnectors: string[];
  allowedTools: string[];
  approval: SanctumApprovalPolicy;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface SanctumResolveRequest {
  connector: string;
  tool: string;
  purpose: string;
  approved?: boolean;
}

export interface SanctumAuditEntry {
  createdAt: string;
  handle: SecretHandle;
  connector: string;
  tool: string;
  purpose: string;
  decision: SanctumAuditDecision;
  reason?: string;
}

export interface SanctumVaultOptions {
  file: string;
  passphrase: string;
}

export interface SanctumVault {
  putSecret(input: SanctumSecretInput): Promise<SanctumSecretMetadata>;
  listSecrets(): Promise<SanctumSecretMetadata[]>;
  resolveSecret(handle: SecretHandle, request: SanctumResolveRequest): Promise<string>;
  readAuditLog(): Promise<SanctumAuditEntry[]>;
}

interface StoredSecret extends SanctumSecretMetadata {
  crypto: {
    algorithm: 'aes-256-gcm';
    salt: string;
    iv: string;
    tag: string;
    ciphertext: string;
  };
}

interface VaultFile {
  version: number;
  secrets: StoredSecret[];
  audit: SanctumAuditEntry[];
}

export async function createSanctumVault(options: SanctumVaultOptions): Promise<SanctumVault> {
  const state = await loadVaultFile(options.file);

  async function save(): Promise<void> {
    await mkdir(path.dirname(options.file), { recursive: true });
    await writeFile(options.file, JSON.stringify(state, null, 2));
  }

  async function audit(entry: Omit<SanctumAuditEntry, 'createdAt'>): Promise<void> {
    state.audit.push({ createdAt: new Date().toISOString(), ...entry });
    await save();
  }

  return {
    async putSecret(input) {
      if (!isSecretHandle(input.handle)) throw new Error('invalid secret handle');
      if (!input.value.trim()) throw new Error('secret value is required');
      const now = new Date().toISOString();
      const existing = state.secrets.find((secret) => secret.handle === input.handle);
      const metadata: SanctumSecretMetadata = {
        handle: input.handle,
        label: input.label,
        allowedConnectors: normalizeList(input.allowedConnectors),
        allowedTools: normalizeList(input.allowedTools),
        approval: input.approval ?? 'per_use',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        expiresAt: input.expiresAt
      };
      const stored: StoredSecret = { ...metadata, crypto: await encryptSecret(input.value, options.passphrase) };
      if (existing) state.secrets[state.secrets.indexOf(existing)] = stored;
      else state.secrets.push(stored);
      await save();
      return metadata;
    },

    async listSecrets() {
      return state.secrets.map(stripCrypto).sort((a, b) => a.handle.localeCompare(b.handle));
    },

    async resolveSecret(handle, request) {
      const secret = state.secrets.find((item) => item.handle === handle);
      if (!secret) {
        await audit({ handle, connector: request.connector, tool: request.tool, purpose: request.purpose, decision: 'denied', reason: 'secret not found' });
        throw new Error('secret not found');
      }
      const connector = request.connector.trim().toLowerCase();
      const tool = request.tool.trim().toLowerCase();
      if (secret.allowedConnectors.length && !secret.allowedConnectors.includes(connector)) {
        await audit({ handle, connector: request.connector, tool: request.tool, purpose: request.purpose, decision: 'denied', reason: 'connector not allowed' });
        throw new Error('connector not allowed for secret handle');
      }
      if (secret.allowedTools.length && !secret.allowedTools.includes(tool)) {
        await audit({ handle, connector: request.connector, tool: request.tool, purpose: request.purpose, decision: 'denied', reason: 'tool not allowed' });
        throw new Error('tool not allowed for secret handle');
      }
      if (secret.approval === 'per_use' && !request.approved) {
        await audit({ handle, connector: request.connector, tool: request.tool, purpose: request.purpose, decision: 'denied', reason: 'approval required' });
        throw new Error('approval required for secret handle');
      }
      const value = await decryptSecret(secret.crypto, options.passphrase);
      await audit({ handle, connector: request.connector, tool: request.tool, purpose: request.purpose, decision: 'allowed' });
      return value;
    },

    async readAuditLog() {
      return [...state.audit];
    }
  };
}

async function loadVaultFile(file: string): Promise<VaultFile> {
  if (!existsSync(file)) return { version: FORMAT_VERSION, secrets: [], audit: [] };
  const parsed = JSON.parse(await readFile(file, 'utf8')) as VaultFile;
  return { version: parsed.version ?? FORMAT_VERSION, secrets: parsed.secrets ?? [], audit: parsed.audit ?? [] };
}

async function encryptSecret(value: string, passphrase: string): Promise<StoredSecret['crypto']> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await scrypt(passphrase, salt, 32) as Buffer;
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { algorithm: 'aes-256-gcm', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

async function decryptSecret(crypto: StoredSecret['crypto'], passphrase: string): Promise<string> {
  const salt = Buffer.from(crypto.salt, 'base64');
  const iv = Buffer.from(crypto.iv, 'base64');
  const key = await scrypt(passphrase, salt, 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(crypto.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(crypto.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

function normalizeList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

function stripCrypto(secret: StoredSecret): SanctumSecretMetadata {
  const { crypto: _crypto, ...metadata } = secret;
  return metadata;
}
