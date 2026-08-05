import { Layer } from "effect";

import { GitCoreLive } from "./Layers/GitCore";
import { GitHubCliLive } from "./Layers/GitHubCli";

/**
 * Product Service Git capability boundary. Provider-backed text generation and
 * orchestration-owned branch flows are intentionally not composed here.
 */
export const GitLayerLive = Layer.mergeAll(GitCoreLive, GitHubCliLive);
