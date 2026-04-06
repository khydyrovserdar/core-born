export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const name = parts[parts.length - 1];

  // Only allow our specific chunk files
  if (!name || !/^model_0[0-7]\.bin$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const ghUrl = `https://github.com/khydyrovserdar/core-born/releases/download/v1.0/${name}`;

    const response = await fetch(ghUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CoreBorn/1.0)',
        'Accept': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      return new Response('Failed to fetch chunk: ' + response.status, { status: 502 });
    }

    // Stream the response body directly — no size limits
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response('Proxy error: ' + err.message, { status: 500 });
  }
};
