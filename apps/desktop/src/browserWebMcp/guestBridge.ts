import { contextBridge, ipcRenderer } from "electron";

import { BROWSER_IPC_CHANNELS } from "../ipcChannels";

/**
 * Install the page-facing WebMCP compatibility API and Haros's private bridge
 * in the main world before application scripts run. This function is
 * serialized by Electron, so every helper intentionally lives inside it.
 */
export function installWebMcpBridgeInMainWorld(hostAllowsCompatibility = false): void {
  type JsonObject = Record<string, unknown>;
  type PageTool = {
    readonly name: string;
    readonly title?: string;
    readonly description: string;
    readonly inputSchema?: unknown;
    readonly execute?: (input: JsonObject, options: { readonly signal: AbortSignal }) => unknown;
    readonly annotations?: {
      readonly readOnlyHint?: boolean;
      readonly untrustedContentHint?: boolean;
    };
    readonly origin?: string;
    readonly window?: Window;
  };
  type RegisteredPageTool = PageTool & {
    readonly origin: string;
    readonly window: Window;
  };

  const BRIDGE_PROPERTY = "__harnessosWebMcpBridgeV1";
  const root = globalThis as typeof globalThis & Record<string, unknown>;
  if (root[BRIDGE_PROPERTY] !== undefined) return;

  const documentRecord = document as Document & { modelContext?: unknown };
  const navigatorRecord = navigator as Navigator & { modelContext?: unknown };
  const documentModelContext = documentRecord.modelContext;
  const navigatorModelContext = navigatorRecord.modelContext;
  const nativeModelContext = documentModelContext ?? navigatorModelContext;
  const documentPolicy = document as Document & {
    readonly permissionsPolicy?: {
      readonly allowsFeature?: (feature: string) => boolean;
      readonly features?: () => readonly string[];
    };
    readonly featurePolicy?: {
      readonly allowsFeature?: (feature: string) => boolean;
      readonly features?: () => readonly string[];
    };
  };
  const permissionsPolicy = documentPolicy.permissionsPolicy ?? documentPolicy.featurePolicy;
  if (globalThis.isSecureContext !== true) return;
  const supportsToolsPolicy = permissionsPolicy?.features?.().includes("tools") === true;
  const toolsPolicyAllowed =
    supportsToolsPolicy && permissionsPolicy?.allowsFeature?.("tools") === true;
  // Native WebMCP owns its own Permissions-Policy enforcement. The compatibility
  // API must fail closed unless Chromium can positively identify and allow the
  // draft's `tools` feature; treating an unknown feature as allowed would ignore
  // a page's policy on Electron versions that predate WebMCP.
  if (!nativeModelContext && !toolsPolicyAllowed && !hostAllowsCompatibility) return;
  if (supportsToolsPolicy && !toolsPolicyAllowed) return;

  const MAX_TOOLS = 128;
  const MAX_NAME_BYTES = 128;
  const MAX_TITLE_BYTES = 1_024;
  const MAX_DESCRIPTION_BYTES = 4_096;
  const MAX_SCHEMA_BYTES = 16_384;
  const MAX_BRIDGE_LIST_BYTES = 24 * 1_024;
  // Tool output is fed back to a model. Keep this materially below the generic
  // browser JSON ceiling so a page cannot flood the turn context.
  const MAX_RESULT_BYTES = 65_536;
  const encoder = new TextEncoder();
  const byteLength = (value: string): number => encoder.encode(value).byteLength;
  const jsonDepth = (value: unknown, depth = 0): number => {
    if (value === null || typeof value !== "object") return depth;
    if (depth > 20) return depth;
    const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
    return children.reduce(
      (maximum, child) => Math.max(maximum, jsonDepth(child, depth + 1)),
      depth,
    );
  };
  const normalizedText = (value: unknown, maximumBytes: number): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]+/gu, " ").trim();
    return normalized.length > 0 && byteLength(normalized) <= maximumBytes ? normalized : null;
  };
  const normalizedToolName = (value: unknown): string | null => {
    const name = normalizedText(value, MAX_NAME_BYTES);
    return name && /^[A-Za-z0-9_.-]+$/u.test(name) ? name : null;
  };
  const descriptorSignature = async (descriptor: string): Promise<string> => {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(descriptor));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  };
  const normalizedSchema = (value: unknown): JsonObject | null => {
    let candidate = value;
    if (typeof candidate === "string") {
      if (byteLength(candidate) > MAX_SCHEMA_BYTES) return null;
      try {
        candidate = JSON.parse(candidate) as unknown;
      } catch {
        return null;
      }
    }
    if (candidate === undefined) candidate = { type: "object", properties: {} };
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate))
      return null;
    try {
      const serialized = JSON.stringify(candidate);
      const cloned = JSON.parse(serialized) as JsonObject;
      if (byteLength(serialized) > MAX_SCHEMA_BYTES || jsonDepth(cloned) > 20) return null;
      return cloned;
    } catch {
      return null;
    }
  };
  const schemaRecord = (value: unknown): JsonObject | null =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : null;
  const supportedSchemaKeywords = new Set([
    "$schema",
    "additionalProperties",
    "allOf",
    "anyOf",
    "const",
    "default",
    "description",
    "enum",
    "examples",
    "items",
    "maximum",
    "maxItems",
    "maxLength",
    "minimum",
    "minItems",
    "minLength",
    "oneOf",
    "properties",
    "required",
    "title",
    "type",
  ]);
  const supportedJsonTypes = new Set([
    "array",
    "boolean",
    "integer",
    "null",
    "number",
    "object",
    "string",
  ]);
  const forbiddenPropertyNames = new Set(["__proto__", "constructor", "prototype"]);
  const schemaIsSupported = (value: unknown, depth = 0): value is JsonObject => {
    const schema = schemaRecord(value);
    if (
      !schema ||
      depth > 20 ||
      Object.keys(schema).some((key) => !supportedSchemaKeywords.has(key))
    ) {
      return false;
    }
    if (
      schema.type !== undefined &&
      (typeof schema.type !== "string" || !supportedJsonTypes.has(schema.type))
    ) {
      return false;
    }
    if (schema.required !== undefined) {
      if (
        !Array.isArray(schema.required) ||
        schema.required.some((key) => typeof key !== "string" || forbiddenPropertyNames.has(key)) ||
        new Set(schema.required).size !== schema.required.length
      ) {
        return false;
      }
    }
    const properties = schema.properties;
    const propertySchemas = properties === undefined ? null : schemaRecord(properties);
    if (
      properties !== undefined &&
      (!propertySchemas ||
        Object.keys(propertySchemas).some((name) => forbiddenPropertyNames.has(name)) ||
        Object.values(propertySchemas).some((property) => !schemaIsSupported(property, depth + 1)))
    ) {
      return false;
    }
    if (
      schema.additionalProperties !== undefined &&
      typeof schema.additionalProperties !== "boolean" &&
      !schemaIsSupported(schema.additionalProperties, depth + 1)
    ) {
      return false;
    }
    if (schema.items !== undefined && !schemaIsSupported(schema.items, depth + 1)) return false;
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      const branches = schema[keyword];
      if (
        branches !== undefined &&
        (!Array.isArray(branches) ||
          branches.length === 0 ||
          branches.some((branch) => !schemaIsSupported(branch, depth + 1)))
      ) {
        return false;
      }
    }
    if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
      return false;
    }
    for (const keyword of ["minimum", "maximum"] as const) {
      const limit = schema[keyword];
      if (limit !== undefined && (typeof limit !== "number" || !Number.isFinite(limit))) {
        return false;
      }
    }
    for (const keyword of ["minItems", "maxItems", "minLength", "maxLength"] as const) {
      const limit = schema[keyword];
      if (limit !== undefined && (!Number.isSafeInteger(limit) || (limit as number) < 0)) {
        return false;
      }
    }
    return true;
  };
  const sameJsonValue = (left: unknown, right: unknown, depth = 0): boolean => {
    if (depth > 20) return false;
    if (left === right) return true;
    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((item, index) => sameJsonValue(item, right[index], depth + 1))
      );
    }
    const leftObject = schemaRecord(left);
    const rightObject = schemaRecord(right);
    if (!leftObject || !rightObject) return false;
    const leftKeys = Object.keys(leftObject);
    const rightKeys = Object.keys(rightObject);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.hasOwn(rightObject, key) &&
          sameJsonValue(leftObject[key], rightObject[key], depth + 1),
      )
    );
  };
  const valueMatchesSchema = (value: unknown, schema: JsonObject, depth = 0): boolean => {
    if (depth > 20) return false;
    if (schema.const !== undefined && !sameJsonValue(value, schema.const)) return false;
    if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJsonValue(value, item))) {
      return false;
    }
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      const branches = schema[keyword];
      if (!Array.isArray(branches)) continue;
      const matchCount = branches.filter((branch) =>
        valueMatchesSchema(value, branch as JsonObject, depth + 1),
      ).length;
      if (keyword === "allOf" && matchCount !== branches.length) return false;
      if (keyword === "anyOf" && matchCount === 0) return false;
      if (keyword === "oneOf" && matchCount !== 1) return false;
    }
    const typeMatches =
      schema.type === undefined ||
      (schema.type === "null" && value === null) ||
      (schema.type === "array" && Array.isArray(value)) ||
      (schema.type === "object" && schemaRecord(value) !== null) ||
      (schema.type === "integer" && typeof value === "number" && Number.isSafeInteger(value)) ||
      (schema.type === "number" && typeof value === "number" && Number.isFinite(value)) ||
      (schema.type === "string" && typeof value === "string") ||
      (schema.type === "boolean" && typeof value === "boolean");
    if (!typeMatches) return false;
    if (typeof value === "number") {
      if (typeof schema.minimum === "number" && value < schema.minimum) return false;
      if (typeof schema.maximum === "number" && value > schema.maximum) return false;
    }
    if (typeof value === "string") {
      if (typeof schema.minLength === "number" && value.length < schema.minLength) return false;
      if (typeof schema.maxLength === "number" && value.length > schema.maxLength) return false;
    }
    if (Array.isArray(value)) {
      if (typeof schema.minItems === "number" && value.length < schema.minItems) return false;
      if (typeof schema.maxItems === "number" && value.length > schema.maxItems) return false;
      if (
        schema.items !== undefined &&
        value.some((item) => !valueMatchesSchema(item, schema.items as JsonObject, depth + 1))
      ) {
        return false;
      }
    }
    const object = schemaRecord(value);
    if (object) {
      if (Object.keys(object).some((key) => forbiddenPropertyNames.has(key))) return false;
      const properties = schemaRecord(schema.properties) ?? {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      if (required.some((key) => !Object.hasOwn(object, String(key)))) return false;
      for (const [key, propertyValue] of Object.entries(object)) {
        const propertySchema = schemaRecord(properties[key]);
        if (propertySchema) {
          if (!valueMatchesSchema(propertyValue, propertySchema, depth + 1)) return false;
          continue;
        }
        if (schema.additionalProperties === false) return false;
        const additionalSchema = schemaRecord(schema.additionalProperties);
        if (additionalSchema && !valueMatchesSchema(propertyValue, additionalSchema, depth + 1)) {
          return false;
        }
      }
    }
    return true;
  };
  const safeError = (error: unknown): { readonly name: string; readonly message: string } => {
    let rawName = "WebMcpToolError";
    let rawMessage = "The page-declared WebMCP tool failed.";
    try {
      if (error instanceof Error) {
        rawName = error.name;
        rawMessage = error.message;
      } else {
        rawMessage = String(error);
      }
    } catch {
      // A page may reject with an object whose coercion itself throws. Never
      // let that hostile error value escape Haros's bounded error envelope.
    }
    return {
      name: normalizedText(rawName, MAX_NAME_BYTES) ?? "WebMcpToolError",
      message:
        normalizedText(rawMessage, MAX_DESCRIPTION_BYTES) ??
        "The page-declared WebMCP tool failed.",
    };
  };

  const awaitWithAbort = async <T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return await operation;
    if (signal.aborted) throw signal.reason;
    return await new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      operation.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  };

  const declarativeForm = Symbol("harnessos.webmcp.declarative-form");
  type DeclarativeTool = RegisteredPageTool & { readonly [declarativeForm]: HTMLFormElement };
  let ensureDeclarativeObservation = (): void => undefined;
  const isDeclarativeControl = (
    element: Element,
  ): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
    (element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) &&
    !element.disabled &&
    element.name.trim().length > 0 &&
    !forbiddenPropertyNames.has(element.name) &&
    (!(element instanceof HTMLInputElement) ||
      !["button", "file", "hidden", "image", "reset", "submit"].includes(element.type));

  const controlDescription = (control: Element): string | undefined => {
    const explicit = normalizedText(control.getAttribute("toolparamdescription"), 1_024);
    if (explicit) return explicit;
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.labels?.length
    ) {
      const label = normalizedText(control.labels[0]?.textContent, 1_024);
      if (label) return label;
    }
    return (
      normalizedText(control.getAttribute("aria-description"), 1_024) ??
      normalizedText(control.getAttribute("aria-label"), 1_024) ??
      undefined
    );
  };

  const declarativeSchema = (form: HTMLFormElement): JsonObject => {
    const properties: Record<string, JsonObject> = Object.create(null) as Record<
      string,
      JsonObject
    >;
    const required = new Set<string>();
    const controls = Array.from(form.elements).filter(isDeclarativeControl);
    for (const control of controls) {
      const name = control.name;
      if (properties[name]) {
        if (control.required) required.add(name);
        continue;
      }
      const description = controlDescription(control);
      let property: JsonObject = { type: "string", ...(description ? { description } : {}) };
      if (control instanceof HTMLInputElement) {
        if (control.type === "checkbox") {
          property = { type: "boolean", ...(description ? { description } : {}) };
        } else if (control.type === "number" || control.type === "range") {
          property = { type: "number", ...(description ? { description } : {}) };
        } else if (control.type === "radio") {
          const values = controls
            .filter(
              (candidate): candidate is HTMLInputElement =>
                candidate instanceof HTMLInputElement &&
                candidate.type === "radio" &&
                candidate.name === name,
            )
            .map((candidate) => candidate.value);
          property = {
            type: "string",
            enum: [...new Set(values)],
            ...(description ? { description } : {}),
          };
        }
      } else if (control instanceof HTMLSelectElement) {
        const values = Array.from(control.options).map((option) => option.value);
        const titles = Array.from(control.options).map((option) => ({
          type: "string",
          const: option.value,
          title: option.textContent?.trim() || option.value,
        }));
        property = control.multiple
          ? {
              type: "array",
              items: { type: "string", enum: values },
              ...(description ? { description } : {}),
            }
          : {
              type: "string",
              anyOf: titles,
              enum: values,
              ...(description ? { description } : {}),
            };
      }
      properties[name] = property;
      if (control.required) required.add(name);
    }
    return {
      type: "object",
      properties,
      additionalProperties: false,
      ...(required.size > 0 ? { required: [...required] } : {}),
    };
  };

  const declarativeTools = (): DeclarativeTool[] =>
    Array.from(document.querySelectorAll<HTMLFormElement>("form[toolname][tooldescription]"))
      .slice(0, MAX_TOOLS)
      .flatMap((form) => {
        const name = normalizedToolName(form.getAttribute("toolname"));
        const description = normalizedText(
          form.getAttribute("tooldescription"),
          MAX_DESCRIPTION_BYTES,
        );
        if (!name || !description) return [];
        const tool = {
          name,
          description,
          inputSchema: declarativeSchema(form),
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          origin: globalThis.location.origin,
          window: globalThis.window,
          execute: async () => null,
          [declarativeForm]: form,
        } satisfies DeclarativeTool;
        return [tool];
      });

  const fillDeclarativeForm = (form: HTMLFormElement, input: JsonObject): void => {
    for (const [name, value] of Object.entries(input)) {
      const controls = Array.from(form.elements).filter(
        (element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          isDeclarativeControl(element) && element.name === name,
      );
      for (const control of controls) {
        if (control instanceof HTMLInputElement && control.type === "checkbox") {
          control.checked = value === true;
        } else if (control instanceof HTMLInputElement && control.type === "radio") {
          control.checked = String(value) === control.value;
        } else if (control instanceof HTMLSelectElement && control.multiple) {
          const selected = new Set(Array.isArray(value) ? value.map(String) : [String(value)]);
          for (const option of Array.from(control.options)) {
            option.selected = selected.has(option.value);
          }
        } else {
          control.value = value === null || value === undefined ? "" : String(value);
        }
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    form.scrollIntoView({ block: "center", inline: "nearest" });
    const firstEditable = Array.from(form.elements).find(isDeclarativeControl);
    firstEditable?.focus({ preventScroll: true });
    const activated = new CustomEvent("toolactivated");
    Object.defineProperty(activated, "toolName", { value: form.getAttribute("toolname") ?? "" });
    (modelContext as EventTarget).dispatchEvent(activated);
  };

  const submitDeclarativeForm = async (
    form: HTMLFormElement,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    if (!form.hasAttribute("toolautosubmit")) {
      return "The page form was filled and is awaiting user submission.";
    }
    const submitter = form.querySelector<HTMLElement>(
      'button[type="submit"], input[type="submit"], button:not([type])',
    );
    const event = new SubmitEvent("submit", {
      bubbles: true,
      cancelable: true,
      submitter:
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter
          : null,
    });
    let response: Promise<unknown> | null = null;
    Object.defineProperty(event, "agentInvoked", { value: true });
    Object.defineProperty(event, "respondWith", {
      value: (result: Promise<unknown>) => {
        if (response) throw new DOMException("respondWith was already called", "InvalidStateError");
        if (!event.defaultPrevented) {
          throw new DOMException("respondWith requires preventDefault", "InvalidStateError");
        }
        response = Promise.resolve(result);
      },
    });
    const shouldSubmit = form.dispatchEvent(event);
    if (response) return await awaitWithAbort(response, signal);
    if (shouldSubmit) HTMLFormElement.prototype.submit.call(form);
    return null;
  };

  class CompatibilityModelContext extends EventTarget {
    readonly #tools = new Map<string, PageTool>();
    #toolChangeHandler: EventListener | null = null;

    get ontoolchange(): EventListener | null {
      return this.#toolChangeHandler;
    }

    set ontoolchange(handler: EventListener | null) {
      if (this.#toolChangeHandler) this.removeEventListener("toolchange", this.#toolChangeHandler);
      this.#toolChangeHandler = typeof handler === "function" ? handler : null;
      if (this.#toolChangeHandler) {
        ensureDeclarativeObservation();
        this.addEventListener("toolchange", this.#toolChangeHandler);
      }
    }

    override addEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (type === "toolchange") ensureDeclarativeObservation();
      super.addEventListener(type, callback, options);
    }

    async registerTool(
      tool: PageTool,
      options: { readonly signal?: AbortSignal } = {},
    ): Promise<void> {
      const name = normalizedToolName(tool?.name);
      const description = normalizedText(tool?.description, MAX_DESCRIPTION_BYTES);
      const title =
        tool?.title === undefined ? undefined : normalizedText(tool.title, MAX_TITLE_BYTES);
      const inputSchema = normalizedSchema(tool?.inputSchema);
      if (
        !name ||
        !description ||
        typeof tool?.execute !== "function" ||
        !inputSchema ||
        !schemaIsSupported(inputSchema)
      ) {
        throw new TypeError("Invalid WebMCP tool definition");
      }
      if (options.signal?.aborted) throw options.signal.reason;
      if (this.#tools.has(name)) {
        throw new DOMException(
          "A WebMCP tool with this name is already registered",
          "InvalidStateError",
        );
      }
      this.#tools.set(name, {
        name,
        ...(title ? { title } : {}),
        description,
        inputSchema,
        execute: tool.execute,
        annotations: {
          readOnlyHint: tool.annotations?.readOnlyHint === true,
          untrustedContentHint: tool.annotations?.untrustedContentHint === true,
        },
      });
      const unregister = () => {
        if (this.#tools.get(name)?.execute !== tool.execute) return;
        this.#tools.delete(name);
        this.dispatchEvent(new Event("toolchange"));
      };
      options.signal?.addEventListener("abort", unregister, { once: true });
      this.dispatchEvent(new Event("toolchange"));
    }

    async getTools(): Promise<RegisteredPageTool[]> {
      ensureDeclarativeObservation();
      const imperative = [...this.#tools.values()].map((tool) => ({
        ...tool,
        origin: globalThis.location.origin,
        window: globalThis.window,
      }));
      const declarative = declarativeTools();
      return [...imperative, ...declarative]
        .toSorted((left, right) => left.name.localeCompare(right.name))
        .slice(0, MAX_TOOLS);
    }

    async executeTool(
      tool: RegisteredPageTool,
      inputObject: JsonObject,
      options: { readonly signal?: AbortSignal } = {},
    ): Promise<string> {
      if (inputObject === null || typeof inputObject !== "object" || Array.isArray(inputObject)) {
        throw new TypeError("WebMCP tool arguments must be a JSON object");
      }
      const inputSchema = normalizedSchema(tool.inputSchema);
      if (
        !inputSchema ||
        !schemaIsSupported(inputSchema) ||
        !valueMatchesSchema(inputObject, inputSchema)
      ) {
        throw new TypeError("WebMCP tool arguments do not match the discovered input schema");
      }
      if (options.signal?.aborted) throw options.signal.reason;
      let result: unknown;
      if (declarativeForm in tool) {
        const form = (tool as DeclarativeTool)[declarativeForm];
        if (!form.isConnected) {
          throw new DOMException("The WebMCP form is stale", "InvalidStateError");
        }
        if (options.signal?.aborted) throw options.signal.reason;
        fillDeclarativeForm(form, inputObject);
        result = await submitDeclarativeForm(form, options.signal);
      } else {
        const registered = this.#tools.get(tool.name);
        if (!registered?.execute) {
          throw new DOMException("The WebMCP tool is stale", "InvalidStateError");
        }
        const controller = new AbortController();
        const forwardAbort = () => controller.abort(options.signal?.reason);
        options.signal?.addEventListener("abort", forwardAbort, { once: true });
        try {
          result = await registered.execute(inputObject, { signal: controller.signal });
        } finally {
          options.signal?.removeEventListener("abort", forwardAbort);
        }
      }
      const serialized = JSON.stringify(result === undefined ? null : result);
      if (serialized === undefined) {
        throw new TypeError("WebMCP tool result is not JSON serializable");
      }
      return serialized;
    }
  }

  let modelContext = nativeModelContext;
  // The current draft moved ModelContext to Document and accepts an object.
  // Chromium's earlier navigator API accepted stringified JSON instead.
  const nativeInputFormat = documentModelContext ? "object" : "json-string";
  let implementation: "native" | "compatibility" = "native";
  if (!modelContext) {
    modelContext = new CompatibilityModelContext();
    implementation = "compatibility";
  }
  if (!documentRecord.modelContext) {
    Object.defineProperty(documentRecord, "modelContext", { value: modelContext });
  }
  if (!navigatorRecord.modelContext) {
    Object.defineProperty(navigatorRecord, "modelContext", { value: modelContext });
  }

  const context = modelContext as {
    readonly getTools: () => Promise<RegisteredPageTool[]>;
    readonly executeTool: (
      tool: RegisteredPageTool,
      input: JsonObject | string,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<unknown>;
  };
  const pending = new Map<string, AbortController>();
  const normalizeTool = async (
    tool: RegisteredPageTool,
    index: number,
  ): Promise<{
    readonly index: number;
    readonly signature: string;
    readonly name: string;
    readonly title?: string;
    readonly description: string;
    readonly inputSchema: JsonObject;
    readonly origin: string;
    readonly annotations: {
      readonly readOnlyHint: boolean;
      readonly untrustedContentHint: boolean;
    };
  } | null> => {
    const name = normalizedToolName(tool?.name);
    const description = normalizedText(tool?.description, MAX_DESCRIPTION_BYTES);
    const title =
      tool?.title === undefined ? undefined : normalizedText(tool.title, MAX_TITLE_BYTES);
    const inputSchema = normalizedSchema(tool?.inputSchema);
    const origin = normalizedText(globalThis.location.origin, 8_192);
    if (!name || !description || !inputSchema || !schemaIsSupported(inputSchema) || !origin)
      return null;
    const descriptor = {
      name,
      ...(title ? { title } : {}),
      description,
      inputSchema,
      origin,
      annotations: {
        readOnlyHint: tool.annotations?.readOnlyHint === true,
        // All page-provided metadata and results are untrusted to Haros even
        // when the page author omits the WebMCP hint.
        untrustedContentHint: true,
      },
    };
    return {
      index,
      signature: await descriptorSignature(JSON.stringify(descriptor)),
      ...descriptor,
    };
  };

  const bridge = Object.freeze({
    version: 1,
    implementation,
    async list() {
      if (typeof context.getTools !== "function" || typeof context.executeTool !== "function") {
        return { available: false, implementation: "unavailable", tools: [], skippedToolCount: 0 };
      }
      const rawTools = await context.getTools();
      const bounded = Array.isArray(rawTools) ? rawTools.slice(0, MAX_TOOLS) : [];
      const tools: Array<NonNullable<Awaited<ReturnType<typeof normalizeTool>>>> = [];
      const seenToolNames = new Set<string>();
      let contentBytes = 0;
      let skippedForBounds = 0;
      for (const [index, tool] of bounded.entries()) {
        const normalized = await normalizeTool(tool, index);
        if (!normalized) {
          skippedForBounds += 1;
          continue;
        }
        if (seenToolNames.has(normalized.name)) {
          skippedForBounds += 1;
          continue;
        }
        const toolBytes = byteLength(JSON.stringify(normalized));
        if (contentBytes + toolBytes > MAX_BRIDGE_LIST_BYTES) {
          skippedForBounds += 1;
          continue;
        }
        contentBytes += toolBytes;
        seenToolNames.add(normalized.name);
        tools.push(normalized);
      }
      return {
        available: true,
        implementation,
        tools,
        skippedToolCount:
          Math.max(0, (Array.isArray(rawTools) ? rawTools.length : 0) - bounded.length) +
          skippedForBounds,
      };
    },
    async invoke(index: number, signature: string, inputJson: string, invocationId: string) {
      const rawTools = await context.getTools();
      const tool = Array.isArray(rawTools) ? rawTools[index] : undefined;
      const normalized = tool ? await normalizeTool(tool, index) : null;
      if (!tool || !normalized || normalized.signature !== signature) return { status: "stale" };
      const parsed = JSON.parse(inputJson) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          status: "failed",
          error: { name: "TypeError", message: "WebMCP tool arguments must be a JSON object." },
        };
      }
      if (!valueMatchesSchema(parsed, normalized.inputSchema)) {
        return { status: "invalid_arguments" };
      }
      const controller = new AbortController();
      pending.set(invocationId, controller);
      try {
        const executionInput =
          implementation === "native" && nativeInputFormat === "json-string"
            ? inputJson
            : (parsed as JsonObject);
        const rawResult = await context.executeTool(tool, executionInput, {
          signal: controller.signal,
        });
        // The current draft returns stringified JSON. Accept an object as well
        // so Haros remains compatible with early-preview Chromium builds.
        const serializedResult =
          typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
        if (
          typeof serializedResult !== "string" ||
          byteLength(serializedResult) > MAX_RESULT_BYTES
        ) {
          return {
            status: "failed",
            error: {
              name: "WebMcpResultTooLarge",
              message: "The page-declared WebMCP tool returned more than 64 KiB of JSON.",
            },
          };
        }
        const cloned = JSON.parse(serializedResult) as unknown;
        if (jsonDepth(cloned) > 20) {
          return {
            status: "failed",
            error: {
              name: "WebMcpResultTooDeep",
              message: "The page-declared WebMCP tool returned JSON deeper than 20 levels.",
            },
          };
        }
        return { status: "completed", result: cloned };
      } catch (error) {
        return { status: "failed", error: safeError(error) };
      } finally {
        pending.delete(invocationId);
      }
    },
    cancel(invocationId: string) {
      pending.get(invocationId)?.abort(new DOMException("WebMCP call cancelled", "AbortError"));
    },
  });
  Object.defineProperty(root, BRIDGE_PROPERTY, {
    value: bridge,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  if (implementation === "compatibility") {
    let observer: MutationObserver | null = null;
    let queued = false;
    const notifyToolChange = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        (modelContext as EventTarget).dispatchEvent(new Event("toolchange"));
      });
    };
    const isInsideToolForm = (value: unknown): boolean => {
      if (value === null || typeof value !== "object") return false;
      const element = value as {
        readonly matches?: (selector: string) => boolean;
        readonly closest?: (selector: string) => unknown;
      };
      return (
        element.matches?.("form[toolname][tooldescription]") === true ||
        Boolean(element.closest?.("form[toolname][tooldescription]"))
      );
    };
    const containsToolForm = (value: unknown): boolean => {
      if (isInsideToolForm(value)) return true;
      if (value === null || typeof value !== "object") return false;
      return Boolean(
        (value as { readonly querySelector?: (selector: string) => unknown }).querySelector?.(
          "form[toolname][tooldescription]",
        ),
      );
    };
    const mutationAffectsTools = (mutation: MutationRecord): boolean => {
      if (mutation.type === "attributes") {
        const target = mutation.target as Element;
        if (
          (mutation.attributeName === "toolname" || mutation.attributeName === "tooldescription") &&
          target.matches?.("form")
        ) {
          return true;
        }
        return isInsideToolForm(target);
      }
      return (
        isInsideToolForm(mutation.target) ||
        Array.from(mutation.addedNodes).some(containsToolForm) ||
        Array.from(mutation.removedNodes).some(containsToolForm)
      );
    };
    ensureDeclarativeObservation = () => {
      if (observer) return;
      observer = new MutationObserver((mutations) => {
        if (mutations.some(mutationAffectsTools)) notifyToolChange();
      });
      observer.observe(document.documentElement ?? document, {
        attributes: true,
        attributeFilter: [
          "disabled",
          "name",
          "required",
          "toolautosubmit",
          "tooldescription",
          "toolname",
          "toolparamdescription",
          "type",
        ],
        childList: true,
        subtree: true,
      });
    };
  }
}

try {
  const hostAllowsCompatibility =
    ipcRenderer.sendSync(BROWSER_IPC_CHANNELS.webMcpCompatibilityPolicy) === true;
  contextBridge.executeInMainWorld({
    func: installWebMcpBridgeInMainWorld,
    args: [hostAllowsCompatibility],
  });
} catch {
  // The browser remains usable through DOM automation if the host Chromium
  // cannot install the compatibility bridge.
}
