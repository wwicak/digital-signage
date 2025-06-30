/**
 * Simple proxy endpoint to help bypass X-Frame-Options restrictions
 * Note: This is a basic implementation. In production, you should add:
 * - Rate limiting
 * - URL validation/allowlist
 * - Proper error handling
 * - Caching headers
 * - Security headers
 */
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    // Validate URL format
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    // Fetch the content from the target URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Digital Signage Proxy/1.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      });
    }

    const contentType = response.headers.get("content-type") || "text/html";

    // For HTML content, we need to modify it to work in an iframe
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Basic HTML modifications for iframe compatibility
      html = html.replace(
        /<head>/i,
        `<head>
        <base href="${new URL(url).origin}/">
        <style>
          /* Prevent the page from trying to break out of iframe */
          html, body { 
            overflow-x: hidden; 
            max-width: 100vw; 
          }
          /* Hide elements that commonly cause iframe issues */
          iframe[src*="facebook"], 
          iframe[src*="twitter"], 
          iframe[src*="instagram"] { 
            display: none !important; 
          }
        </style>
        <script>
          // Prevent page from breaking out of iframe
          if (window.top !== window.self) {
            // We're in an iframe, disable problematic behaviors
            window.top = window.self;
            window.parent = window.self;
          }
        </script>`
      );

      // Remove or modify X-Frame-Options meta tags
      html = html.replace(
        /<meta[^>]*http-equiv=['"]?X-Frame-Options['"]?[^>]*>/gi,
        ""
      );

      // Set appropriate headers for iframe embedding
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Content-Security-Policy", "frame-ancestors *");

      return res.send(html);
    } else {
      // For non-HTML content, just proxy it through
      const buffer = await response.arrayBuffer();

      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Frame-Options", "ALLOWALL");

      return res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({
      error: "Failed to fetch the requested URL",
      details:
        process.env.NODE_ENV === "development"
          ? (error instanceof Error ? error.message : "Unknown error")
          : undefined,
    });
  }
}

export const config = {
  api: {
    responseLimit: "10mb", // Adjust based on your needs
  },
};
