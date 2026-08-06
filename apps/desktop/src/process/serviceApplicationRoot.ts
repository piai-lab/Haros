import path from "node:path";

export function resolveServiceApplicationRoot(input: {
  readonly packaged: boolean;
  readonly repositoryRoot: string;
  readonly packagedAppPath: string;
}): string {
  const root = input.packaged ? input.packagedAppPath : input.repositoryRoot;
  if (!path.isAbsolute(root)) {
    throw new Error("Product Service application root must be absolute.");
  }
  return path.normalize(root);
}

export function attachServiceApplicationRoot(
  environment: NodeJS.ProcessEnv,
  applicationRoot: string,
): NodeJS.ProcessEnv {
  if (!path.isAbsolute(applicationRoot)) {
    throw new Error("Product Service application root must be absolute.");
  }
  return { ...environment, OMNIMIND_APP_ROOT: path.normalize(applicationRoot) };
}
