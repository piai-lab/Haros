import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesGetInput,
  OmniMindModelServicesListResult,
} from "./omnimindModelServices";

const descriptor = {
  serviceId: "deepseek",
  providerId: "deepseek",
  displayName: "DeepSeek",
  origin: "builtin",
  authMethods: [
    { type: "api_key", label: "DeepSeek API key", canLogin: true, subscription: false },
  ],
  authState: "configured",
  authSource: "stored",
  storedCredentialType: "api_key",
  knownModelCount: 3,
  availableModelCount: 3,
  supportsNetworkRefresh: true,
  catalogState: "ready",
  catalogErrorCode: null,
} as const;

describe("OmniMind model-services contracts", () => {
  it("decodes the credential-blind list projection", () => {
    const decoded = Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
      state: "ready",
      services: [descriptor],
      errorCode: null,
    });

    expect(decoded.services[0]).toEqual(descriptor);
  });

  it("rejects path-shaped get inputs and invalid counts", () => {
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({
        serviceId: "/private/.omnimind/agent/auth.json",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({ serviceId: "小米代理" }),
    ).toEqual({ serviceId: "小米代理" });
    for (const serviceId of ["..", "provider/child", "provider\\child", "provider\u202esecret"]) {
      expect(() =>
        Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({ serviceId }),
      ).toThrow();
    }
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({
        ...descriptor,
        availableModelCount: -1,
      }),
    ).toThrow();
  });

  it("rejects path, URL, control, and bidi-shaped display labels", () => {
    for (const displayName of [
      "/private/agent/auth.json",
      "C:\\private\\auth.json",
      "\\\\server\\share",
      "file:///private/auth.json",
      "https://secret.example.test/v1",
      "Unsafe\u061c label",
      "Unsafe\u200f label",
      "Unsafe\u009f label",
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({ ...descriptor, displayName }),
      ).toThrow();
    }
  });

  it("rejects contradictory projection and catalog error states", () => {
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "error",
        services: [],
        errorCode: null,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({
        ...descriptor,
        catalogState: "ready",
        catalogErrorCode: "catalog_unavailable",
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "ready",
        services: [],
        errorCode: null,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "empty",
        services: [descriptor],
        errorCode: null,
      }),
    ).toThrow();
  });

  it("strips secret, endpoint, header, and path fields from encoded output", () => {
    const encoded = Schema.encodeSync(OmniMindModelServiceDescriptor)({
      ...descriptor,
      apiKey: "sk-secret",
      endpoint: "https://secret.example.test/v1",
      headers: { Authorization: "Bearer secret" },
      authPath: "/private/.omnimind/agent/auth.json",
    } as typeof descriptor);
    const serialized = JSON.stringify(encoded);

    expect(serialized).not.toContain("sk-secret");
    expect(serialized).not.toContain("secret.example.test");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("auth.json");
  });
});
