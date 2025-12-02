import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers
        });
    }

    // Only allow GET and POST
    if (request.method !== 'POST' && request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers });
    }

    try {
        const url = new URL(request.url);
        // Strip the /api/anthropic prefix
        const path = url.pathname.replace(/^\/api\/anthropic/, '');
        const targetUrl = `https://api.anthropic.com${path}${url.search}`;

        console.log(`Proxying ${request.method} request to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': request.headers.get('x-api-key') || '',
                'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: request.body
        });

        // Stream the response back
        return new Response(response.body, {
            status: response.status,
            headers: {
                ...headers,
                'Content-Type': response.headers.get('Content-Type') || 'application/json'
            }
        });

    } catch (error: any) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Failed to proxy request', details: error.message }), {
            status: 500,
            headers
        });
    }
};
