import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
      style={{ scrollMarginTop: "2rem" }}
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
    </div>
  );
};
