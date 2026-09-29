import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy } from '@phosphor-icons/react';
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
    <div className={'group relative ' + className}>
      <button
        type="button"
        onClick={onCopy}
        className="absolute cursor-pointer right-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <Check size={13} weight="bold" className="text-ok" /> : <Copy size={13} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <pre className="overflow-auto rounded-lg border border-line bg-subtle p-4 pr-24 font-mono text-[12.5px] leading-6 text-ink">
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
  -d '{"event":"signup_completed","properties":{"plan":"pro"},"queued":false}'`;

  const statsEndpoints = `GET /api/stats/events?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/stats/top-events?from=YYYY-MM-DD&to=YYYY-MM-DD

# /stats/events     → { total, daily: [{ date, count }] }
# /stats/top-events → { total, top: [{ event_name, count, last_seen }] }`;

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
  "${apiUrl}/track"
);

analytics.track("signup_completed", {
  plan: "pro",
});`;

  return (
    <div className="grid grid-cols-1 gap-4 max-w-4xl">
      <Card title="Track events" subtitle="Send custom events to Pulseboard via HTTP">
        <p className="text-sm text-ink-2">
          Event names support <span className="font-medium text-ink">letters, numbers and underscores</span>{' '}
          (<code className="rounded bg-subtle px-1 py-0.5 font-mono text-[12px] text-ink">[A-Za-z0-9_]+</code>).
        </p>

        <CodeBlock className="mt-3" code={trackCurl} />

        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="font-mono text-ink">queued: false</dt>
          <dd className="text-ink-3">Written inline, before the response</dd>
          <dt className="font-mono text-ink">queued: true</dt>
          <dd className="text-ink-3">Handed to the Convex scheduler and written asynchronously</dd>
        </dl>

        {!apiKeyPresent ? (
          <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            Set <span className="font-mono font-medium">VITE_API_KEY</span> in the dashboard env to enable requests.
          </p>
        ) : null}
      </Card>

      <Card title="Fetch stats" subtitle="Query aggregated analytics for charts">
        <CodeBlock code={statsEndpoints} />
        <CodeBlock className="mt-3" code={statsCurl} />
      </Card>

      <Card title="SDK usage (local)" subtitle="Not published on npm (yet)">
        <a
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          href="https://github.com/lalitbing/pulseboard-analytics"
          target="_blank"
          rel="noreferrer"
        >
          <span className="text-ink-3">GitHub</span>
          lalitbing/pulseboard-analytics
          <ArrowUpRight size={14} className="text-ink-3" />
        </a>

        <CodeBlock code={sdkInstall} />
        <CodeBlock className="mt-3" code={sdkExample} />
      </Card>
    </div>
  );
}

