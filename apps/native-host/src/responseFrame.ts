import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  type NativeHostResponse,
} from "@omnimind/contracts/native-host";

function encodedBytes(response: NativeHostResponse): number {
  return Buffer.byteLength(`${JSON.stringify(response)}\n`, "utf8");
}

function takeWhileFrameFits<Item>(
  items: ReadonlyArray<Item>,
  responseWith: (items: ReadonlyArray<Item>) => NativeHostResponse,
): ReadonlyArray<Item> {
  if (items.length === 0) return items;
  const retained: Item[] = [];
  for (const item of items) {
    const candidate = [...retained, item];
    if (encodedBytes(responseWith(candidate)) > NATIVE_HOST_MAX_FRAME_BYTES) break;
    retained.push(item);
  }
  if (retained.length === 0) {
    throw new Error("A single valid Native Host response item exceeded the frame invariant.");
  }
  return retained;
}

/**
 * Applies the transport byte invariant after the authenticated response envelope exists.
 * Content stays intact; only whole catalog models or sequenced facts are paginated.
 */
export function fitNativeHostResponseFrame(response: NativeHostResponse): NativeHostResponse {
  if (encodedBytes(response) <= NATIVE_HOST_MAX_FRAME_BYTES) return response;
  if (response.kind === "runtime.catalog.response") {
    const models = takeWhileFrameFits(response.models, (candidate) => ({
      ...response,
      models: candidate,
      truncated: true,
    }));
    return { ...response, models, truncated: true };
  }
  if (response.kind === "runtime.facts.response") {
    const facts = takeWhileFrameFits(response.facts, (candidate) => ({
      ...response,
      facts: candidate,
    }));
    return { ...response, facts };
  }
  if (response.kind === "runtime.reconcile.response") {
    const facts = takeWhileFrameFits(response.facts, (candidate) => ({
      ...response,
      facts: candidate,
    }));
    return { ...response, facts };
  }
  throw new Error(`Native Host response ${response.kind} exceeded the frame invariant.`);
}
