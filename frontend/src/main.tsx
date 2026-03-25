import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// No StrictMode — it causes WebGL canvas double-mount which kills the 3D context
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
