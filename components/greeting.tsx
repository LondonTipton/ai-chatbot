"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const Greeting = () => {
  const greetingRef = useRef<HTMLDivElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      const keyboardVisible = heightDiff > 150;
      setIsKeyboardVisible(keyboardVisible);

      // Scroll greeting into view when keyboard appears
      if (keyboardVisible && greetingRef.current) {
        setTimeout(() => {
          greetingRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    };

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

  return (
    <motion.div
      animate={{
        marginTop: isKeyboardVisible ? "1rem" : undefined,
      }}
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
      ref={greetingRef}
      style={{ scrollMarginTop: "1rem" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-3xl md:text-5xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        Welcome,{" "}
        <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
          Counsel.
        </span>
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl text-zinc-500 md:text-3xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        How can I{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          assist
        </span>{" "}
        you with your{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          legal matters
        </span>{" "}
        today?
      </motion.div>
    </motion.div>
  );
};
