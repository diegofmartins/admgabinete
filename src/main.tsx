import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { configurarTokenProvider } from './services/auth';
import { iniciarFirebase, obterTokenFirebase } from './services/firebase';
import './index.css';

iniciarFirebase();
configurarTokenProvider(obterTokenFirebase);

createRoot(document.getElementById('root')!).render(<App />);
