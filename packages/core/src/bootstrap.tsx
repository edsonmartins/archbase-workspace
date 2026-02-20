import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './swRegistration';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

registerServiceWorker();
