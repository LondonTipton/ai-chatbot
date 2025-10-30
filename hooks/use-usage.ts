"use client";

import useSWR from "swr";

type UsageData = {
  requestsToday: number;
  dailyLimit: number;
  plan: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUsage() {
  const { data, error, mutate } = useSWR<UsageData>(
    "/api/usage/current",
    fetcher,
    {
      // Refresh every 5 minutes instead of 30 seconds
      refreshInterval: 5 * 60 * 1000,
      // Revalidate on focus but not too frequently
      revalidateOnFocus: false,
      // Cache for 2 minutes
      dedupingInterval: 2 * 60 * 1000,
    }
  );

  return {
    usage: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
