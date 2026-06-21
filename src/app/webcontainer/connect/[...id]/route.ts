import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>WebContainer Connect</title>
</head>
<body>
  <script type="module">
    import { setupConnect } from "https://esm.sh/@webcontainer/api@1.6.1/connect";
    setupConnect();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "Cross-Origin-Opener-Policy": "unsafe-none",
    },
  });
}
