import React, { useState, useEffect } from 'react';

interface AIChatProps {
    onJsonUpdate: (json: string) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIModel {
    id: string;
    display_name: string;
    created_at: string;
}

const SYSTEM_PROMPT = `
You are an expert Excalidraw JSON generator. Your task is to generate a valid Excalidraw JSON array of elements based on the user's description.
Output ONLY the JSON array. Do not include any markdown formatting, explanations, or code blocks.

The JSON should be an array of objects, where each object represents an element (rectangle, ellipse, diamond, arrow, text, line).
Common properties: type, x, y, width, height, angle, strokeColor, backgroundColor, fillStyle (hachure, cross-hatch, solid), strokeWidth, roughness, opacity.

IMPORTANT for Arrows:
- Arrows MUST have 'points' array (e.g., [[0,0], [100, 100]]).
- To connect shapes, use 'startBinding' and 'endBinding'.
- 'startBinding': { "elementId": "id_of_start_shape", "focus": 0.5, "gap": 1 }
- 'endBinding': { "elementId": "id_of_end_shape", "focus": 0.5, "gap": 1 }
- Ensure shapes have explicit 'id' fields so arrows can reference them.

Example output:
[
  {
    "id": "rect-1",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 100,
    "height": 50,
    "backgroundColor": "#ffc9c9",
    "strokeColor": "#000000",
    "fillStyle": "solid",
    "roughness": 1
  },
  {
    "id": "rect-2",
    "type": "rectangle",
    "x": 300,
    "y": 100,
    "width": 100,
    "height": 50,
    "backgroundColor": "#c9c9ff",
    "strokeColor": "#000000",
    "fillStyle": "solid",
    "roughness": 1
  },
  {
    "type": "arrow",
    "x": 200,
    "y": 125,
    "width": 100,
    "height": 0,
    "strokeColor": "#000000",
    "points": [[0, 0], [100, 0]],
    "startBinding": { "elementId": "rect-1", "focus": 0.5, "gap": 1 },
    "endBinding": { "elementId": "rect-2", "focus": 0.5, "gap": 1 }
  }
]
`;

export const AIChat: React.FC<AIChatProps> = ({ onJsonUpdate }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Describe a diagram, and I will generate it for you!' }
    ]);
    const [loading, setLoading] = useState(false);

    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    useEffect(() => {
        const storedProvider = localStorage.getItem('ai_provider');
        const storedKey = localStorage.getItem('ai_api_key');
        const storedModel = localStorage.getItem('ai_model');

        if (storedProvider) setProvider(storedProvider as any);
        if (storedKey) setApiKey(storedKey);
        if (storedModel) setModel(storedModel);
    }, []);

    // Fetch models when provider is Anthropic and key is present
    useEffect(() => {
        if (provider === 'anthropic' && apiKey && showSettings) {
            fetchAnthropicModels();
        }
    }, [provider, apiKey, showSettings]);

    const saveSettings = () => {
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('ai_api_key', apiKey);
        localStorage.setItem('ai_model', model);
        setShowSettings(false);
    };

    const fetchAnthropicModels = async () => {
        setFetchingModels(true);
        try {
            const response = await fetch('/api/anthropic/v1/models', {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'anthropic-dangerous-direct-browser-access': 'true'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const models: AIModel[] = data.data.sort((a: AIModel, b: AIModel) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setAvailableModels(models);

                // If current model is not set or not in list, default to the latest
                if (!model || !models.find(m => m.id === model)) {
                    if (models.length > 0) {
                        setModel(models[0].id);
                    }
                }
            } else {
                console.error("Failed to fetch models", await response.text());
            }
        } catch (error) {
            console.error("Error fetching models", error);
        } finally {
            setFetchingModels(false);
        }
    };

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const processResponse = (content: string) => {
        try {
            // Clean up potential markdown code blocks
            let cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const elements = JSON.parse(cleanContent);

            // Post-process to ensure valid Excalidraw elements
            const processedElements = elements.map((el: any) => ({
                ...el,
                id: el.id || generateId(),
                version: el.version || 1,
                versionNonce: el.versionNonce || 0,
                isDeleted: false,
                seed: el.seed || Math.floor(Math.random() * 100000)
            }));

            return JSON.stringify(processedElements, null, 2);
        } catch (e) {
            console.error("Failed to parse AI response", e);
            throw new Error("AI response was not valid JSON");
        }
    };

    const callOpenAI = async (userPrompt: string) => {
        const response = await fetch('/api/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: (model || "gpt-4o").trim(),
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI API Error (${response.status} ${response.statusText}): ${text}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const callAnthropic = async (userPrompt: string) => {
        const response = await fetch('/api/anthropic/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: (model || "claude-3-5-sonnet-20240620").trim(),
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                messages: [
                    { role: "user", content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Anthropic Error Details:", text);
            throw new Error(`Anthropic API Error (${response.status} ${response.statusText}): ${text}`);
        }

        const data = await response.json();
        return data.content[0].text;
    };

    const handleSend = async () => {
        if (!prompt.trim()) return;
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        const userMsg = { role: 'user' as const, content: prompt };
        setMessages(prev => [...prev, userMsg]);
        setPrompt('');
        setLoading(true);

        try {
            let rawResponse = "";
            if (provider === 'openai') {
                rawResponse = await callOpenAI(userMsg.content);
            } else {
                rawResponse = await callAnthropic(userMsg.content);
            }

            const json = processResponse(rawResponse);
            const aiMsg = { role: 'assistant' as const, content: 'Diagram generated!' };
            setMessages(prev => [...prev, aiMsg]);
            onJsonUpdate(json);
        } catch (err: any) {
            const errMsg = { role: 'assistant' as const, content: `Error: ${err.message}` };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-chat">
            <div className="chat-header">
                <span>AI Assistant</span>
                <button onClick={() => setShowSettings(!showSettings)} className="settings-btn">⚙️</button>
            </div>

            {showSettings && (
                <div className="settings-panel">
                    <div className="form-group">
                        <label>Provider</label>
                        <select value={provider} onChange={(e) => {
                            setProvider(e.target.value as any);
                            setAvailableModels([]); // Reset models when provider changes
                        }}>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={`Enter ${provider} API Key`}
                        />
                    </div>
                    <div className="form-group">
                        <label>Model {fetchingModels && "(Fetching...)"}</label>
                        {provider === 'anthropic' && availableModels.length > 0 ? (
                            <select value={model} onChange={(e) => setModel(e.target.value)}>
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.display_name} ({m.id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="e.g. gpt-4o or claude-3-5-sonnet-20240620"
                            />
                        )}
                        {provider === 'anthropic' && (
                            <button
                                className="text-xs text-blue-500 underline mt-1 text-left"
                                onClick={fetchAnthropicModels}
                                disabled={!apiKey}
                            >
                                Refresh Models
                            </button>
                        )}
                    </div>
                    <button onClick={saveSettings} className="save-btn">Save Settings</button>
                </div>
            )}

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        {msg.content}
                    </div>
                ))}
                {loading && <div className="message assistant typing">Thinking...</div>}
            </div>
            <div className="chat-input-area">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Draw a flow chart..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <button onClick={handleSend} disabled={loading || !prompt.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
};
