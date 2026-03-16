import React, { useState } from 'react';
import { generateScript, generateAutoStartInstructions } from '../utils/scriptGenerator';

export default function DeviceScriptModal({ device, onClose }) {
  const [os, setOs] = useState('mac');
  const [tab, setTab] = useState('script');
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;
  const script = generateScript(device._id, appUrl, os);
  const instructions = generateAutoStartInstructions(os);
  const filename = os === 'windows' ? 'billboard-display.bat' : 'billboard-display.sh';

  const download = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard.writeText(tab === 'script' ? script : instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Display Setup Script</h2>
            <p className="text-sm text-gray-500 mt-0.5">{device.deviceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex space-x-2 mb-4">
            {[{ id: 'mac', label: 'macOS' }, { id: 'windows', label: 'Windows' }, { id: 'linux', label: 'Linux' }].map(o => (
              <button key={o.id} onClick={() => setOs(o.id)}
                className={"px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors " +
                  (os === o.id ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
            {[{ id: 'script', label: 'Script' }, { id: 'autostart', label: 'Auto-start Setup' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={"px-3 py-1.5 rounded text-sm font-medium transition-colors " +
                  (tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <pre className="bg-gray-950 text-green-400 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {tab === 'script' ? script : instructions}
          </pre>
        </div>

        {tab === 'script' && (
          <div className="px-6 pb-2">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 space-y-1">
              <p className="font-medium mb-1">How to use:</p>
              <p>1. Download the script below</p>
              {os !== 'windows' && <p>2. Open terminal → run: <code className="bg-blue-100 px-1 rounded">chmod +x {filename}</code></p>}
              <p>{os !== 'windows' ? '3' : '2'}. Run the script — Chrome opens in full-screen kiosk mode</p>
              <p>{os !== 'windows' ? '4' : '3'}. See <strong>Auto-start Setup</strong> tab to run on boot automatically</p>
            </div>
          </div>
        )}

        <div className="p-6 pt-3 flex space-x-3">
          <button onClick={download}
            className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download {filename}</span>
          </button>
          <button onClick={copy}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}