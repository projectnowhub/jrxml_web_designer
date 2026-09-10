export function closeTab(): void {
  window.setTimeout(() => {
    window.close();

    window.setTimeout(() => {
      if (window.closed) {
        return;
      }

      document.body.innerHTML = `
        <main class="close-tab-page">
          <div class="close-tab-check" aria-hidden="true">&#10003;</div>
          <h1>CDP is running on your desktop</h1>
          <p>You can now close this browser tab. The application will continue to run independently.</p>
        </main>
      `;

      const style = document.createElement("style");
      style.textContent = `
        :root {
          --close-tab-bg: #f9fafb;
          --close-tab-text: #111827;
          --close-tab-muted: #6b7280;
          --close-tab-check: #10b981;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --close-tab-bg: #111827;
            --close-tab-text: #f9fafb;
            --close-tab-muted: #d1d5db;
            --close-tab-check: #059669;
          }
        }

        .close-tab-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--close-tab-bg);
          color: var(--close-tab-text);
          font-family: system-ui, -apple-system, sans-serif;
          text-align: center;
        }

        .close-tab-check {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          border-radius: 50%;
          background: var(--close-tab-check);
          color: white;
          font-size: 32px;
        }

        .close-tab-page h1 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .close-tab-page p {
          max-width: 360px;
          margin: 0;
          color: var(--close-tab-muted);
          line-height: 1.5;
        }
      `;
      document.head.appendChild(style);
    }, 100);
  }, 500);
}
