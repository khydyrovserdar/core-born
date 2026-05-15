// Cloudflare Worker — serves static assets + handles waitlist

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Waitlist signup endpoint
    if (url.pathname === '/waitlist') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
      }

      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      let email;
      try {
        const body = await request.json();
        email = (body.email || '').trim().toLowerCase();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      if (!email || !email.includes('@') || !email.includes('.')) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      // Save to D1
      try {
        await env.DB.prepare(
          'INSERT INTO waitlist (email) VALUES (?)'
        ).bind(email).run();
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          // Already signed up — still return success
          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }
        return new Response(JSON.stringify({ error: 'Database error' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      // Send confirmation email via Resend
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CORE BORN <noreply@coreborn.art>',
            to: email,
            subject: 'You\'re on the list.',
            html: `
              <div style="background:#000;color:#fff;font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;padding:48px 32px;">
                <div style="font-size:13px;font-weight:900;letter-spacing:6px;margin-bottom:32px;">CORE<span style="color:#cc2020;">.</span>BORN</div>
                <div style="width:40px;height:1px;background:#cc2020;margin-bottom:32px;"></div>
                <h1 style="font-size:28px;font-weight:800;margin:0 0 16px;line-height:1.2;">You're on the list.</h1>
                <p style="font-size:14px;color:#888;line-height:1.8;margin:0 0 32px;">
                  We'll notify you the moment the first drop goes live.<br>
                  One piece. One owner. Don't miss it.
                </p>
                <div style="width:40px;height:1px;background:#222;margin-bottom:24px;"></div>
                <p style="font-size:11px;color:#444;letter-spacing:2px;">COREBORN.ART</p>
              </div>
            `
          })
        });
      } catch {
        // Email failed but signup was saved — still return success
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // All other requests → serve static assets
    return env.ASSETS.fetch(request);
  },
};
