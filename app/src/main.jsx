import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode は開発時に効果が二重に走り、Supabase の PKCE（URL の code は一度のみ有効）
// と相性が悪く、Google 復帰直後だけセッションが付かないことがある。そのため無効にしている。
createRoot(document.getElementById('root')).render(<App />)
