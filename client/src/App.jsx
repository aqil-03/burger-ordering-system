import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import VendorProtectedRoute from './components/vendor/VendorProtectedRoute'
import { CartProvider } from './context/CartContext'
import { CheckoutProvider } from './context/CheckoutContext'
import CartPage from './pages/customer/CartPage'
import MenuPage from './pages/customer/MenuPage'
import OrderConfirmationPage from './pages/customer/OrderConfirmationPage'
import NotFoundPage from './pages/NotFoundPage'
import VendorDashboardPage from './pages/vendor/VendorDashboardPage'
import VendorLoginPage from './pages/vendor/VendorLoginPage'
import VendorMenuPage from './pages/vendor/VendorMenuPage'
import VendorQrPage from './pages/vendor/VendorQrPage'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CartProvider>
        <CheckoutProvider>
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/order/:trackingToken"
              element={<OrderConfirmationPage />}
            />
            <Route path="/vendor/login" element={<VendorLoginPage />} />
            <Route element={<VendorProtectedRoute />}>
              <Route path="/vendor" element={<VendorDashboardPage />} />
              <Route path="/vendor/menu" element={<VendorMenuPage />} />
              <Route path="/vendor/qr" element={<VendorQrPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </CheckoutProvider>
      </CartProvider>
    </BrowserRouter>
  )
}
