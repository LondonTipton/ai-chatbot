import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const returnUrl = searchParams.get("returnUrl") || "/";

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing sessionId or userId" },
        { status: 400 }
      );
    }

    console.log(
      `[cookie-bridge] Setting cookies via JS bridge for userId=${userId.substring(
        0,
        8
      )}...`
    );

    // Return HTML that sets cookies via JavaScript and then redirects
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Setting up authentication...</title>
      </head>
      <body>
        <div style="font-family: Arial; text-align: center; margin-top: 50px;">
          <h2>Completing login...</h2>
          <p>Please wait while we set up your session.</p>
        </div>
        <script>
          console.log('[cookie-bridge] Setting cookies and auth tokens via JavaScript...');
          
          // Set cookies via JavaScript (these will be available immediately)
          document.cookie = 'appwrite-session-js=${sessionId}; path=/; SameSite=Lax; max-age=' + (60*60*24*30);
          document.cookie = 'appwrite_user_id_js=${userId}; path=/; SameSite=Lax; max-age=' + (60*60*24*30);
          
          // Also set localStorage fallback for immediate use
          const tempAuthToken = btoa(JSON.stringify({
            userId: '${userId}',
            sessionId: '${sessionId}',
            timestamp: Date.now()
          }));
          localStorage.setItem('temp-auth-token', tempAuthToken);
          
          console.log('[cookie-bridge] Cookies and tokens set, redirecting...');
          
          // For development, also set a special header flag
          sessionStorage.setItem('auth-bypass', 'true');
          
          // Wait a moment and redirect to the return URL
          setTimeout(function() {
            window.location.href = '${returnUrl}';
          }, 1000);
        </script>
      </body>
    </html>
    `;

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(isProduction && process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {}),
    };

    // Set httpOnly cookies on the response to ensure server-side visibility immediately
    const response = new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
    response.cookies.set("appwrite-session", sessionId, cookieOptions);
    response.cookies.set("appwrite_user_id", userId, cookieOptions);

    return response;
  } catch (error) {
    console.error("[cookie-bridge] Error:", error);
    return NextResponse.json(
      { error: "Failed to set cookies" },
      { status: 500 }
    );
  }
}
