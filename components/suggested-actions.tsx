"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [hasEnoughSpace, setHasEnoughSpace] = useState(true);

  useEffect(() => {
    // Detect when keyboard appears on mobile by monitoring viewport height changes
    // Also detect if viewport is too short to show both greeting and suggestions
    const handleResize = () => {
      // On mobile, if viewport height shrinks significantly, keyboard is likely visible
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      // If height difference is more than 150px, assume keyboard is visible
      setIsKeyboardVisible(heightDiff > 150);

      // Check if viewport is tall enough to show both greeting and suggestions
      // Need ~500px minimum: greeting (150px) + suggestions (250px) + input (100px)
      setHasEnoughSpace(viewportHeight >= 500);
    };

    // Run on mount
    handleResize();

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const suggestedActions = [
    "What are the key differences between customary and general law in Zimbabwe?",
    "Explain the constitutional provisions for property rights under the 2013 Constitution",
    "How does the Labour Act protect workers' rights in Zimbabwe?",
    "What is the legal framework for intellectual property in Zimbabwe?",
  ];

  return (
    <motion.div
      animate={{
        opacity: isKeyboardVisible || !hasEnoughSpace ? 0 : 1,
        height: isKeyboardVisible || !hasEnoughSpace ? 0 : "auto",
        marginBottom: isKeyboardVisible || !hasEnoughSpace ? 0 : undefined,
        overflow: "hidden",
      }}
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
      initial={{ opacity: 1, height: "auto" }}
      style={{
        pointerEvents: isKeyboardVisible || !hasEnoughSpace ? "none" : "auto",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full justify-start whitespace-normal p-4 text-left text-sm"
            onClick={(suggestion) => {
              window.history.replaceState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </motion.div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
