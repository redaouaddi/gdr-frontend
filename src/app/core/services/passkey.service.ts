import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface RegisterOptionsResponse {
  challenge: string;
  rpId: string;
  rpName: string;
  userName: string;
}

export interface RegisterVerifyRequest {
  credentialId: string;
  publicKey: string;
  signCount: number;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {
  private apiUrl = 'http://localhost:8080/api/passkey';

  constructor(private http: HttpClient) {}

  async isPasskeySupported(): Promise<boolean> {
    if (
      typeof window === 'undefined' ||
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  async startRegistration(email: string): Promise<any> {
    const options = await firstValueFrom(
      this.http.post<RegisterOptionsResponse>(
        `${this.apiUrl}/register/options?email=${encodeURIComponent(email)}`,
        {},
        { withCredentials: true }
      )
    );

    const challengeBytes = this.base64UrlToUint8Array(options.challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: this.uint8ArrayToArrayBuffer(challengeBytes),
      rp: {
        name: options.rpName,
        id: options.rpId
      },
      user: {
        id: this.stringToArrayBuffer(options.userName),
        name: options.userName,
        displayName: options.userName
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required'
      },
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({
      publicKey
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Création de la passkey annulée ou échouée.');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    const publicKeyBuffer = response.getPublicKey();
    const safePublicKeyBuffer = publicKeyBuffer ?? new ArrayBuffer(0);

    const payload: RegisterVerifyRequest = {
      credentialId: credential.id,
      publicKey: this.arrayBufferToBase64Url(safePublicKeyBuffer),
      signCount: 0,
      label: 'Face ID / Passkey'
    };

    return await firstValueFrom(
      this.http.post(
        `${this.apiUrl}/register/verify`,
        payload,
        { withCredentials: true }
      )
    );
  }

  private stringToArrayBuffer(value: string): ArrayBuffer {
    const bytes = new TextEncoder().encode(value);
    return this.uint8ArrayToArrayBuffer(bytes);
  }

  private base64UrlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  private uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.slice().buffer as ArrayBuffer;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}