import React, { useState } from 'react';

interface GitHubFile {
    path: string;
    url: string;
    sha: string;
}

interface GitHubExplorerProps {
    onFileSelect: (content: string, path: string, sha: string, repoUrl: string) => void;
}

export const GitHubExplorer: React.FC<GitHubExplorerProps> = ({ onFileSelect }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [files, setFiles] = useState<GitHubFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        setFiles([]);

        try {
            // Extract owner and repo from URL
            // Expected format: https://github.com/owner/repo
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                throw new Error("Invalid GitHub URL");
            }

            const owner = match[1];
            const repo = match[2];

            // Try main branch first, then master if that fails
            let branch = 'main';
            let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);

            if (!response.ok) {
                branch = 'master';
                response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
            }

            if (!response.ok) {
                throw new Error("Failed to fetch repository files. Check URL or rate limits.");
            }

            const data = await response.json();
            const excalidrawFiles = data.tree.filter((file: any) => file.path.endsWith('.excalidraw') || file.path.endsWith('.json'));
            setFiles(excalidrawFiles);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileClick = async (file: GitHubFile) => {
        setLoading(true);
        try {
            // The 'url' in the tree response is for the API, which returns a JSON with base64 content
            // We can fetch that and decode
            const response = await fetch(file.url);
            if (!response.ok) throw new Error("Failed to fetch file content");

            const data = await response.json();
            const content = atob(data.content);
            onFileSelect(content, file.path, file.sha, repoUrl);
        } catch (err: any) {
            setError("Failed to load file: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="github-explorer">
            <div className="github-header">
                <h3>GitHub Explorer</h3>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="https://github.com/owner/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                    />
                    <button onClick={fetchFiles} disabled={loading}>
                        {loading ? '...' : 'Go'}
                    </button>
                </div>
                {error && <div className="error-message">{error}</div>}
            </div>
            <div className="file-list">
                {files.map((file) => (
                    <div
                        key={file.sha}
                        className="file-item"
                        onClick={() => handleFileClick(file)}
                    >
                        {file.path}
                    </div>
                ))}
                {files.length === 0 && !loading && !error && (
                    <div className="empty-state">No files loaded</div>
                )}
            </div>
        </div>
    );
};
