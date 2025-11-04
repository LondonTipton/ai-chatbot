import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Get Weather Tool for Mastra
 * Demo tool for testing tool integration
 */
export const getWeatherTool = createTool({
  id: "get-weather",
  description:
    "Get the current weather at a location. This is a demo tool for testing purposes.",

  inputSchema: z.object({
    latitude: z.number().describe("Latitude coordinate"),
    longitude: z.number().describe("Longitude coordinate"),
  }),

  outputSchema: z.object({
    temperature: z.number().describe("Current temperature in Celsius"),
    conditions: z.string().describe("Weather conditions"),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),

  execute: async ({ context }) => {
    const { latitude, longitude } = context;

    console.log(`[Mastra Tool] Getting weather for: ${latitude}, ${longitude}`);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const weatherData = await response.json();

      return {
        temperature: weatherData.current?.temperature_2m || 0,
        conditions: "Clear", // Simplified for demo
        location: {
          latitude,
          longitude,
        },
      };
    } catch (error) {
      console.error("[Mastra Tool] Weather fetch error:", error);
      throw error;
    }
  },
});
