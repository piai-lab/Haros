type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonWhitespace(character: string): boolean {
  return character === " " || character === "\t" || character === "\n" || character === "\r";
}

function removeTrailingCommas(source: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  let previousSignificantCharacter = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;

    if (inString) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      previousSignificantCharacter = character;
      continue;
    }

    if (character === ",") {
      let nextIndex = index + 1;
      while (nextIndex < source.length && isJsonWhitespace(source[nextIndex]!)) {
        nextIndex += 1;
      }
      const nextCharacter = source[nextIndex];
      if (
        (nextCharacter === "}" || nextCharacter === "]") &&
        previousSignificantCharacter !== "" &&
        !"{[,:".includes(previousSignificantCharacter)
      ) {
        continue;
      }
    }

    output += character;
    if (!isJsonWhitespace(character)) {
      previousSignificantCharacter = character;
    }
  }

  if (inString) {
    throw new Error("Expected Bun text lockfile to contain a complete JSON string.");
  }

  return output;
}

export function readBunV1WorkspaceImporters(source: string): readonly string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(removeTrailingCommas(source));
  } catch (cause) {
    throw new Error("Expected bun.lock to use valid Bun v1 text lockfile syntax.", { cause });
  }

  if (!isJsonRecord(parsed) || parsed.lockfileVersion !== 1) {
    throw new Error("Expected bun.lock to declare lockfileVersion 1.");
  }
  if (!isJsonRecord(parsed.workspaces)) {
    throw new Error("Expected bun.lock to contain a workspaces object.");
  }
  if (!isJsonRecord(parsed.packages)) {
    throw new Error("Expected bun.lock to contain a packages object.");
  }
  for (const [workspacePath, importer] of Object.entries(parsed.workspaces)) {
    if (!isJsonRecord(importer)) {
      throw new Error(`Expected bun.lock workspace '${workspacePath}' to be an importer object.`);
    }
  }

  return Object.keys(parsed.workspaces);
}
