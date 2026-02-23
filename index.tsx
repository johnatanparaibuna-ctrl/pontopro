import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const initApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Critical Error: Failed to find the root element');
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Initialization Crash:', err);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; text-align: center;">
        <h2>Erro ao carregar o sistema</h2>
        <p>Por favor, recarregue a página ou contacte o suporte técnico.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Recarregar</button>
      </div>
    `;
  }
};

// Garantir que o DOM está totalmente pronto antes de tentar montar o React
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}