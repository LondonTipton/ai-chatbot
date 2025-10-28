"use client";

import { useEffect, useState } from "react";

export default function CookieDebugPage() {
  const [cookies, setCookies] = useState<string>("");
  const [appwriteCookies, setAppwriteCookies] = useState<string[]>([]);

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);

    // Filter for Appwrite-related cookies
    const allCookies = document.cookie.split(";");
    const appwriteRelated = allCookies.filter(
      (cookie) =>
        cookie.includes("appwrite") ||
        cookie.includes("a_session") ||
        cookie.includes("user_id")
    );
    setAppwriteCookies(appwriteRelated);
  }, []);

  const refreshCookies = () => {
    setCookies(document.cookie);
    const allCookies = document.cookie.split(";");
    const appwriteRelated = allCookies.filter(
      (cookie) =>
        cookie.includes("appwrite") ||
        cookie.includes("a_session") ||
        cookie.includes("user_id")
    );
    setAppwriteCookies(appwriteRelated);
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 font-bold text-2xl">Cookie Debug Page</h1>
      <button
        className="mb-4 rounded bg-blue-500 px-4 py-2 text-white"
        onClick={refreshCookies}
      >
        Refresh Cookies
      </button>

      <div className="mb-6">
        <h2 className="mb-2 font-semibold text-lg">All Cookies:</h2>
        <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm">
          {cookies || "No cookies found"}
        </pre>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-lg">
          Appwrite-related Cookies:
        </h2>
        {appwriteCookies.length > 0 ? (
          <ul className="space-y-2">
            {appwriteCookies.map((cookie, index) => (
              <li className="rounded bg-gray-100 p-2 text-sm" key={index}>
                {cookie.trim()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No Appwrite cookies found</p>
        )}
      </div>
    </div>
  );
}
