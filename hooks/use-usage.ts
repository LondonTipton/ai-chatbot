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
      // Refresh every 10 seconds for near real-time updates
      // This is safe because:
      // 1. The API endpoint is lightweight (single DB query)
      // 2. SWR deduplicates requests across components
      // 3. Manual mutate() calls provide instant updates
      refreshInterval: 10 * 1000,
      // Revalidate on focus to catch updates when user returns
      revalidateOnFocus: true,
      // Allow manual refetching every 3 seconds
      // This prevents race conditions from rapid manual mutate() calls
      dedupingInterval: 3 * 1000,
      // Keep data fresh but don't refetch on mount if recently fetched
      revalidateIfStale: true,
      // Revalidate when window regains focus (already true, but explicit)
      revalidateOnReconnect: true,
    }
  );

  return {
    usage: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
