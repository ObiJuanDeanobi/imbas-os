import type { ArtifactVaultApi } from '../preload/api';

declare global {
  interface Window {
    artifactVault: ArtifactVaultApi;
  }
}

export {};
