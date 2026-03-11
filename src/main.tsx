import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DiceThrower from './DiceThrower.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <DiceThrower />
   </StrictMode>,
)
