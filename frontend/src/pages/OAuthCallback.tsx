import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const provider = searchParams.get('state') || 'outlook';

    if (window.opener && code) {
      window.opener.postMessage({ type: 'OAUTH_CALLBACK', code, provider }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground text-sm">Connecting account, please wait...</p>
    </div>
  );
}
