import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET and POST
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed', headers };
    }

    try {
        // Strip the /api/anthropic prefix to get the path for the real API
        const path = event.path.replace(/^\/\.netlify\/functions\/anthropic-proxy/, '').replace(/^\/api\/anthropic/, '');
        const targetUrl = `https://api.anthropic.com${path}`;

        console.log(`Proxying ${event.httpMethod} request to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: event.httpMethod,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': event.headers['x-api-key'] || '',
                'anthropic-version': event.headers['anthropic-version'] || '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: event.body ? event.body : undefined
        });

        const data = await response.text();

        return {
            statusCode: response.status,
            headers,
            body: data
        };
    } catch (error: any) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to proxy request', details: error.message })
        };
    }
};
