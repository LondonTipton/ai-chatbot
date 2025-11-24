// Constants
export const MAX_INPUT_LENGTH = 10_000; // 10k characters for user input
export const MAX_MESSAGE_LENGTH = 50_000; // For AI responses

import sanitizeHtml from "sanitize-html";

export type SanitizationResult = {
  sanitized: string;
  isValid: boolean;
  errors: string[];
  truncated?: boolean;
};

/**
 * Escape HTML special characters to prevent XSS
 * NOTE: This is kept for potential use in output sanitization
 * Input sanitization does NOT escape HTML to allow natural typing
 */
// biome-ignore lint/correctness/noUnusedVariables: Kept for potential output sanitization use
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Validate if a string is a URL
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Regex for private IP detection (defined at top level for performance)
const PRIVATE_IP_REGEX = /^172\.(1[6-9]|2\d|3[01])\./;

/**
 * Remove control characters from string
 */
function removeControlCharacters(text: string): string {
  // Remove null bytes and other control characters except newlines and tabs
  // Using String methods instead of regex to avoid linting issues with control chars
  return text
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep normal characters, newlines (\n = 10), tabs (\t = 9)
      return code >= 32 || code === 10 || code === 9;
    })
    .join("");
}

/**
 * Sanitize user input to prevent XSS, SQL injection, and other attacks
 * Uses sanitize-html to strip dangerous tags while preserving safe text
 */
export function sanitizeUserInput(input: string): SanitizationResult {
  const errors: string[] = [];
  let truncated = false;

  // Check if input is empty
  if (!input || input.trim().length === 0) {
    errors.push("Input cannot be empty");
    return { sanitized: "", isValid: false, errors };
  }

  // Check length and truncate if necessary
  let sanitizedInput = input;
  if (input.length > MAX_INPUT_LENGTH) {
    sanitizedInput = input.slice(0, MAX_INPUT_LENGTH);
    truncated = true;
    errors.push(
      `Input exceeded maximum length of ${MAX_INPUT_LENGTH} characters and was truncated`
    );
  }

  // Remove control characters
  sanitizedInput = removeControlCharacters(sanitizedInput);

  // Light whitespace normalization - just limit excessive newlines
  // Don't trim individual lines to preserve formatting
  sanitizedInput = sanitizedInput
    .replace(/\n{4,}/g, "\n\n\n") // Limit to max 3 consecutive newlines
    .trim(); // Just trim start/end

  // Use sanitize-html to sanitize HTML/scripts
  // We allow standard text formatting but strip scripts, iframes, etc.
  // IMPORTANT: Use 'recursiveEscape' mode to preserve plain text content
  // Without this, plain text messages get stripped entirely
  sanitizedInput = sanitizeHtml(sanitizedInput, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // KEY FIX: Escape disallowed tags instead of removing them
    // This preserves plain text while converting dangerous tags to safe text
    disallowedTagsMode: "recursiveEscape",
  });

  // Final check - if sanitized is empty, it's invalid
  if (!sanitizedInput || sanitizedInput.trim().length === 0) {
    errors.push("Input contains no valid content after sanitization");
    return { sanitized: "", isValid: false, errors };
  }

  return {
    sanitized: sanitizedInput,
    isValid: errors.length === 0 || truncated, // Valid if only truncation warning
    errors,
    truncated,
  };
}

/**
 * Sanitize markdown/HTML output before rendering
 * Uses sanitize-html to ensure no XSS in AI responses
 */
export function sanitizeMarkdownOutput(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) {
    return "";
  }

  // Truncate if too long
  let sanitized = markdown;
  if (markdown.length > MAX_MESSAGE_LENGTH) {
    sanitized = `${markdown.slice(
      0,
      MAX_MESSAGE_LENGTH
    )}\n\n[Content truncated...]`;
  }

  // Use sanitize-html for robust sanitization
  // Allow more tags for markdown output (tables, headings, etc.)
  sanitized = sanitizeHtml(sanitized, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "pre",
      "code",
      "span",
      "div",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
      a: ["href", "target", "rel"],
      code: ["class"],
      span: ["class"],
      div: ["class"],
    },
    // Disallow dangerous attributes
    disallowedTagsMode: "discard",
  });

  return sanitized;
}

/**
 * Sanitize file names to prevent directory traversal attacks
 */
export function sanitizeFileName(fileName: string): SanitizationResult {
  const errors: string[] = [];

  if (!fileName || fileName.trim().length === 0) {
    errors.push("File name cannot be empty");
    return { sanitized: "", isValid: false, errors };
  }

  // Remove path traversal patterns
  let sanitized = fileName.replace(/\.\./g, "").replace(/[/\\]/g, "");

  // Remove special characters that might cause issues
  sanitized = sanitized.replace(/[<>:"|?*]/g, "");

  // Remove control characters
  sanitized = removeControlCharacters(sanitized);

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.slice(0, 255);
    errors.push("File name was truncated to 255 characters");
  }

  if (!sanitized || sanitized.trim().length === 0) {
    errors.push("File name contains no valid characters");
    return { sanitized: "", isValid: false, errors };
  }

  return { sanitized, isValid: errors.length === 0, errors };
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(url: string): SanitizationResult {
  const errors: string[] = [];

  if (!url || url.trim().length === 0) {
    errors.push("URL cannot be empty");
    return { sanitized: "", isValid: false, errors };
  }

  // Check if URL is valid
  if (!isValidUrl(url)) {
    errors.push("Invalid URL format");
    return { sanitized: "", isValid: false, errors };
  }

  // Additional security checks
  try {
    const urlObj = new URL(url);

    // Block dangerous protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      errors.push("Only HTTP and HTTPS protocols are allowed");
      return { sanitized: "", isValid: false, errors };
    }

    // Block local/private IPs (optional security measure)
    const hostname = urlObj.hostname.toLowerCase();
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const isPrivateIp =
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      PRIVATE_IP_REGEX.test(hostname);

    if (isLocalhost || isPrivateIp) {
      errors.push("Local and private IP addresses are not allowed");
      return { sanitized: "", isValid: false, errors };
    }

    return { sanitized: url, isValid: true, errors: [] };
  } catch {
    errors.push("Invalid URL");
    return { sanitized: "", isValid: false, errors };
  }
}

/**
 * Rate limiting helper - simple in-memory store
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    // Limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Cleanup old rate limit entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000); // Cleanup every minute
}
