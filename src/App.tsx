import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { SmoothScroll } from '@/lib/smooth'
import { Pages } from '@/routes'
import NotFound from '@/pages/NotFound'

// No build standalone (arquivo aberto do disco) as rotas usam hash: banco-inter.html#/cartoes
const Router = import.meta.env.MODE === 'standalone' ? HashRouter : BrowserRouter

export function App() {
  return (
    <Router>
      <SmoothScroll>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Pages.Home />} />
            <Route path="cartoes" element={<Pages.Cards />} />
            <Route path="shopping" element={<Pages.Shopping />} />
            <Route path="emprestimos" element={<Pages.Loans />} />
            <Route path="investimentos" element={<Pages.Investments />} />
            <Route path="sobre" element={<Pages.About />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SmoothScroll>
    </Router>
  )
}
