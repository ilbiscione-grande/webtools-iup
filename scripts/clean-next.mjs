import { rm } from "node:fs/promises";

const run = async () => {
  try {
    await rm(".next", {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 250,
    });
  } catch (error) {
    console.error("Could not clean .next before build.");
    throw error;
  }
};

await run();
