import { useEffect, useState } from 'react';
import Card from './Card';

function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Fallback (best effort)
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
        setCopied(true);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className={'relative ' + className}>
      <button
        type="button"
        onClick={onCopy}
        className="absolute cursor-pointer right-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white/80 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        aria-label={copied ? 'Copied' : 'Copy'}
      >
        {copied ? (
          <>
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-emerald-600"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Copied</span>
          </>
        ) : (
          <>
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-gray-600"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy</span>
          </>
        )}
      </button>

      <pre className="overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-3 pt-10 text-[12px] leading-5 text-gray-900">
        {code}
      </pre>
    </div>
  );
}

export default function IntegrationView({
  apiUrl,
  apiKeyPresent,
}: {
  apiUrl: string;
  apiKeyPresent: boolean;
}) {
  const trackCurl = `curl -X POST "${apiUrl}/track" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"signup_completed","properties":{"plan":"pro"},"useRedis":false}'`;

  const statsEndpoints = `GET /api/stats/events?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/stats/top-events`;

  const statsCurl = `curl -H "x-api-key: YOUR_API_KEY" "${apiUrl}/stats/events?from=YYYY-MM-DD&to=YYYY-MM-DD"
curl -H "x-api-key: YOUR_API_KEY" "${apiUrl}/stats/top-events"`;

  const sdkInstall = `# From this monorepo:
cd packages/sdk
npm install
npm run build

# Then, from your app:
npm install file:../packages/sdk`;

  const sdkExample = `import { Analytics } from "pulseboard-sdk";

const analytics = new Analytics(
  "PROJECT_API_KEY",
  "https://your-api-domain/api/track"
);

analytics.track("signup_completed", {
  plan: "pro",
});`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="📡 Track events" subtitle="Send custom events to Pulseboard via HTTP">
        <p className="text-sm text-gray-700">
          Event names support <span className="font-semibold">alphabets, numbers, and underscore</span>{' '}
          (<span className="font-mono">[A-Za-z0-9_]+</span>).
        </p>

        <CodeBlock className="mt-3" code={trackCurl} />

        <div className="mt-3 space-y-1 text-xs text-gray-600">
          <p>
            <span className="font-semibold">useRedis: false</span> → direct insert into DB
          </p>
          <p>
            <span className="font-semibold">useRedis: true</span> → queue to Redis (requires the worker)
          </p>
        </div>

        {!apiKeyPresent ? (
          <p className="mt-3 text-xs text-amber-700">
            Set <span className="font-semibold">VITE_API_KEY</span> in the dashboard env to enable requests.
          </p>
        ) : null}
      </Card>

      <Card title="Fetch stats" subtitle="Query aggregated analytics for charts">
        <CodeBlock code={statsEndpoints} />
        <CodeBlock className="mt-3" code={statsCurl} />
      </Card>

      <Card title="📦 SDK usage (local)" subtitle="Not published on npm (yet)">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-gray-600">Github repo</span>
          <span className="text-gray-300">•</span>
          <a
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            href="https://github.com/lalitbing/pulseboard-analytics"
            target="_blank"
            rel="noreferrer"
          >
            lalitbing/pulseboard-analytics
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-gray-500"
            >
              <path d="M7 17 17 7" />
              <path d="M10 7h7v7" />
            </svg>
          </a>
        </div>

        <CodeBlock code={sdkInstall} />
        <CodeBlock className="mt-3" code={sdkExample} />
      </Card>
    </div>
  );
}

