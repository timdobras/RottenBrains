'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'Roboto, sans-serif',
            backgroundColor: '#0f0f0f',
            color: '#ffffff',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#34cfeb',
              color: '#000000',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
