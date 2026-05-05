// Cloudflare Pages Function — proxies model chunks from GitHub Releases
// Handles /chunks/:name

const SPLIT_CHUNKS = {
  'model_01.bin': ['model_01_a.bin', 'model_01_b.bin', 'model_01_c.bin', 'model_01_d.bin', 'model_01_e.bin'],
};

const GH_BASE = 'https://github.com/khydyrovserdar/core-born/releases/download/v1.0/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/octet-stream',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

async function fetchGitHub(name) {
  const resp = await fetch(GH_BASE + name, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CoreBorn/1.0)',
      'Accept': 'application/octet-stream',
    },
  });
  if (!resp.ok) throw new Error(`GitHub returned ${resp.status} for ${name}`);
  return resp.arrayBuffer();
}

export async function onRequest(context) {
  const { params, request } = context;
  const name = params.name;

  // CORS preflight
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

  if (!name || !/^model_0[0-7]\.bin$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    if (SPLIT_CHUNKS[name]) {
      // Fetch all sub-pieces in parallel and concatenate
      const pieces = await Promise.all(SPLIT_CHUNKS[name].map(fetchGitHub));
      const total = pieces.reduce((s, b) => s + b.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const buf of pieces) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }
      return new Response(merged, { status: 200, headers: CORS });
    } else {
      // Stream directly from GitHub
      const resp = await fetch(GH_BASE + name, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CoreBorn/1.0)',
          'Accept': 'application/octet-stream',
        },
      });
      if (!resp.ok) {
        return new Response('Failed to fetch chunk: ' + resp.status, { status: 502 });
      }
      return new Response(resp.body, { status: 200, headers: CORS });
    }
  } catch (err) {
    return new Response('Proxy error: ' + err.message, { status: 500 });
  }
}
