"use client";

import { useEffect, useState } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        // Calculate keyboard height
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const height = Math.max(0, windowHeight - viewportHeight);
        // Add 16px buffer to keep input comfortably above keyboard
        setKeyboardHeight(height > 0 ? height + 16 : 0);
      }
    };

    // Initial check
    handleResize();

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

  return keyboardHeight;
}
