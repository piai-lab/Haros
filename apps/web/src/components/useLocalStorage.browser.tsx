// FILE: useLocalStorage.browser.tsx
// Purpose: Proves same-key functional updates compose from durable state.
// Layer: Browser hook test

import { Schema } from "effect";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { useLocalStorage } from "../hooks/useLocalStorage";

const TEST_KEY = "harnessos:test:shared-local-storage";
const SharedValue = Schema.Struct({ typography: Schema.Number, width: Schema.Number });
const INITIAL_VALUE = { typography: 12, width: 208 };

function TypographyUpgrade() {
  const [, setValue] = useLocalStorage(TEST_KEY, INITIAL_VALUE, SharedValue);
  useEffect(() => {
    setValue((previous) => ({ ...previous, typography: 14 }));
  }, [setValue]);
  return null;
}

function SidebarUpgrade() {
  const [, setValue] = useLocalStorage(TEST_KEY, INITIAL_VALUE, SharedValue);
  useEffect(() => {
    setValue((previous) => ({ ...previous, width: 368 }));
  }, [setValue]);
  return null;
}

describe("useLocalStorage", () => {
  afterEach(() => {
    localStorage.removeItem(TEST_KEY);
    document.body.innerHTML = "";
  });

  it("composes same-key updates from independent mounted subscribers", async () => {
    localStorage.setItem(TEST_KEY, JSON.stringify(INITIAL_VALUE));

    await render(
      <>
        <TypographyUpgrade />
        <SidebarUpgrade />
      </>,
    );

    await expect
      .poll(() => JSON.parse(localStorage.getItem(TEST_KEY) ?? "null"))
      .toEqual({ typography: 14, width: 368 });
  });
});
