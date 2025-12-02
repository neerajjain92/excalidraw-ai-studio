import { useState, useRef } from 'react';
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import './index.css';
import { GitHubExplorer } from './components/GitHubExplorer';

function App() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [jsonValue, setJsonValue] = useState<string>("[]");
  const isUpdatingFromJSON = useRef(false);

  // Handle changes from Excalidraw
  const onChange = (elements: readonly ExcalidrawElement[], appState: AppState) => {
    if (isUpdatingFromJSON.current) return;

    const data = {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
      },
      files: {}
    };

    setJsonValue(JSON.stringify(data.elements, null, 2));
  };

  // Handle changes from JSON Editor
  const onJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setJsonValue(newValue);

    if (!excalidrawAPI) return;

    if (newValue.trim() === "") {
      isUpdatingFromJSON.current = true;
      excalidrawAPI.updateScene({
        elements: [],
      });
      setTimeout(() => { isUpdatingFromJSON.current = false; }, 50);
      return;
    }

    try {
      const parsed = JSON.parse(newValue);
      updateSceneFromJSON(parsed);
    } catch (err) {
      // Invalid JSON, ignore
    }
  };

  const updateSceneFromJSON = (parsed: any) => {
    if (!excalidrawAPI) return;

    isUpdatingFromJSON.current = true;

    try {
      if (Array.isArray(parsed)) {
        excalidrawAPI.updateScene({
          elements: convertToExcalidrawElements(parsed),
        });
      } else if (parsed.elements) {
        excalidrawAPI.updateScene({
          elements: convertToExcalidrawElements(parsed.elements),
          appState: parsed.appState
        });
      }
    } catch (e) {
      console.error("Failed to update scene", e);
    }

    setTimeout(() => { isUpdatingFromJSON.current = false; }, 50);
  };

  const onGitHubFileSelect = (content: string) => {
    setJsonValue(content);
    try {
      const parsed = JSON.parse(content);
      updateSceneFromJSON(parsed);
    } catch (e) {
      console.error("Invalid JSON from GitHub", e);
    }
  };

  return (
    <div className="container">
      <div className="left-panel">
        <GitHubExplorer onFileSelect={onGitHubFileSelect} />
        <div className="json-panel-header">
          JSON Editor
        </div>
        <textarea
          className="json-editor"
          value={jsonValue}
          onChange={onJsonChange}
          spellCheck={false}
        />
      </div>
      <div className="excalidraw-panel">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export default App;
