import React, { useState, useEffect } from 'react';

interface GitHubSaverProps {
    content: string;
    initialPath?: string;
    initialSha?: string;
    repoUrl?: string; // e.g. https://github.com/owner/repo
}

export const GitHubSaver: React.FC<GitHubSaverProps> = ({ content, initialPath, initialSha, repoUrl }) => {
    const [token, setToken] = useState('');
    const [path, setPath] = useState(initialPath || '');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('github_pat');
        if (storedToken) setToken(storedToken);
    }, []);

    useEffect(() => {
        if (initialPath) setPath(initialPath);
    }, [initialPath]);

    const handleSave = async () => {
        if (!token || !path || !message || !repoUrl) {
            setStatus({ type: 'error', msg: "Missing fields (Token, Path, Message, or Repo URL)" });
            return;
        }

        setLoading(true);
        setStatus(null);
        localStorage.setItem('github_pat', token);

        try {
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid Repo URL");
            const owner = match[1];
            const repo = match[2];

            // 1. Get current SHA if not provided (or if we changed path)
            // We might be creating a new file, so 404 is okay.
            let shaToUse = initialSha;

            // If we don't have a SHA, or if the path is different from initial, let's try to fetch it
            // to see if we are overwriting an existing file.
            if (!shaToUse || path !== initialPath) {
                try {
                    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (getRes.ok) {
                        const getData = await getRes.json();
                        shaToUse = getData.sha;
                    }
                } catch (e) {
                    // Ignore, assume new file
                }
            }

            // 2. Create/Update file
            const body = {
                message: message,
                content: btoa(content), // Base64 encode
                sha: shaToUse
            };

            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Failed to save");
            }

            const data = await response.json();
            setStatus({ type: 'success', msg: `Saved! Commit: ${data.commit.sha.substring(0, 7)}` });
            setMessage(''); // Clear message on success
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!repoUrl) return null;

    return (
        <div className="github-saver">
            <h3>Save to GitHub</h3>
            <div className="saver-form">
                <div className="form-group">
                    <label>Repo:</label>
                    <span className="repo-display">{repoUrl}</span>
                </div>
                <div className="form-group">
                    <label>
                        Token (PAT):
                        <a
                            href="https://github.com/settings/tokens/new?description=Excalidraw+AI+Studio&scopes=repo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pat-link"
                            style={{ marginLeft: '5px', fontSize: '10px' }}
                        >
                            (Generate)
                        </a>
                    </label>
                    <input
                        type="password"
                        placeholder="ghp_..."
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>File Path:</label>
                    <input
                        type="text"
                        placeholder="diagrams/my-drawing.excalidraw"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Commit Message:</label>
                    <input
                        type="text"
                        placeholder="Update diagram"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>
                <button onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Commit & Push'}
                </button>
                {status && (
                    <div className={`status-message ${status.type}`}>
                        {status.msg}
                    </div>
                )}
            </div>
        </div>
    );
};
