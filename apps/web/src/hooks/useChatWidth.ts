// FILE: useChatWidth.ts
// Purpose: Applies the selected chat column width preset as a root CSS variable.
// Layer: Web route lifecycle hook
// Exports: useChatWidth

import { useEffect } from "react";

import { useLocalPreferences } from "../localPreferences";
import {
  getChatWidthCssVariables,
  normalizeChatWidthMode,
  type ChatWidthCssVariable,
} from "../lib/chatWidth";

const CHAT_WIDTH_CSS_VARIABLES = Object.keys(
  getChatWidthCssVariables(),
) as readonly ChatWidthCssVariable[];

export function useChatWidth() {
  const { preferences } = useLocalPreferences();
  const chatWidth = normalizeChatWidthMode(preferences.chatWidth);

  useEffect(() => {
    const root = document.documentElement;
    const rootStyle = root.style;
    const variableValues = getChatWidthCssVariables(chatWidth);

    for (const cssVariable of CHAT_WIDTH_CSS_VARIABLES) {
      rootStyle.setProperty(cssVariable, variableValues[cssVariable]);
    }
    root.dataset.chatWidth = chatWidth;

    return () => {
      for (const cssVariable of CHAT_WIDTH_CSS_VARIABLES) {
        rootStyle.removeProperty(cssVariable);
      }
      delete root.dataset.chatWidth;
    };
  }, [chatWidth]);
}
