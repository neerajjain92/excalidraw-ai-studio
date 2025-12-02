import React, { useState } from 'react';

interface AIChatProps {
    onJsonUpdate: (json: string) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const AIChat: React.FC<AIChatProps> = ({ onJsonUpdate }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Describe a diagram, and I will generate it for you!' }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!prompt.trim()) return;

        const userMsg = { role: 'user' as const, content: prompt };
        setMessages(prev => [...prev, userMsg]);
        setPrompt('');
        setLoading(true);

        // Mock AI generation
        setTimeout(() => {
            const mockJson = JSON.stringify([
                {
                    type: "rectangle",
                    version: 1,
                    versionNonce: 0,
                    isDeleted: false,
                    id: "rect-1",
                    fillStyle: "hachure",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    x: 100,
                    y: 100,
                    strokeColor: "#000000",
                    backgroundColor: "#ffc9c9",
                    width: 200,
                    height: 100,
                    seed: 1,
                    groupIds: [],
                    roundness: null,
                    boundElements: [],
                    updated: 1,
                    link: null,
                    locked: false,
                },
                {
                    type: "text",
                    version: 1,
                    versionNonce: 0,
                    isDeleted: false,
                    id: "text-1",
                    fillStyle: "hachure",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    x: 120,
                    y: 135,
                    strokeColor: "#000000",
                    backgroundColor: "transparent",
                    width: 160,
                    height: 30,
                    seed: 1,
                    groupIds: [],
                    roundness: null,
                    boundElements: [],
                    updated: 1,
                    link: null,
                    locked: false,
                    fontSize: 20,
                    fontFamily: 1,
                    text: "AI Generated!",
                    textAlign: "center",
                    verticalAlign: "middle",
                    baseline: 18,
                    containerId: null,
                    originalText: "AI Generated!",
                }
            ], null, 2);

            const aiMsg = { role: 'assistant' as const, content: 'Here is a simple diagram for you. (Mock)' };
            setMessages(prev => [...prev, aiMsg]);
            onJsonUpdate(mockJson);
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="ai-chat">
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
