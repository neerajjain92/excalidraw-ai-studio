import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Strip the /api/anthropic prefix to get the path for the real API
        // The redirect in netlify.toml sends /api/anthropic/* -> /.netlify/functions/anthropic-proxy
        // So we need to reconstruct the path. 
        // Actually, simpler: we know we are calling /v1/messages usually.
        // Let's just forward to https://api.anthropic.com/v1/messages if the path ends with it.

        // Better approach: Get the path from the event and replace the prefix
        const path = event.path.replace(/^\/\.netlify\/functions\/anthropic-proxy/, '').replace(/^\/api\/anthropic/, '');
        const targetUrl = `https://api.anthropic.com${path}`;

        console.log(`Proxying request to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': event.headers['x-api-key'] || '',
                'anthropic-version': event.headers['anthropic-version'] || '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: event.body
        });

        const data = await response.text();

        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow all origins for now
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: data
        };
    } catch (error: any) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to proxy request', details: error.message })
        };
    }
};
