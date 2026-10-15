import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth, RequireRole, RootLayout, RouteError } from '@/pages/RootLayout'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const PaymentConfirmPage = lazy(() => import('@/pages/PaymentConfirmPage'))
const LinePayDemoPage = lazy(() => import('@/pages/LinePayDemoPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const SeekerLayout = lazy(() => import('@/pages/seeker/SeekerLayout'))
const HomePage = lazy(() => import('@/pages/seeker/HomePage'))
const SearchPage = lazy(() => import('@/pages/seeker/SearchPage'))
const DetailPage = lazy(() => import('@/pages/seeker/DetailPage'))
const OrderHistoryPage = lazy(() => import('@/pages/seeker/OrderHistoryPage'))
const CareLogListPage = lazy(() => import('@/pages/seeker/CareLogListPage'))
const ProfilePage = lazy(() => import('@/pages/seeker/ProfilePage'))
const KinshipSettingsPage = lazy(() => import('@/pages/seeker/KinshipSettingsPage'))

const ProviderLayout = lazy(() => import('@/pages/provider/ProviderLayout'))
const ProviderDashboard = lazy(() => import('@/pages/provider/ProviderDashboard'))
const ProviderRequestsPage = lazy(() => import('@/pages/provider/ProviderRequestsPage'))
const ProviderSchedulePage = lazy(() => import('@/pages/provider/ProviderSchedulePage'))
const ProviderProfilePage = lazy(() => import('@/pages/provider/ProviderProfilePage'))

const MessagesPage = lazy(() => import('@/pages/shared/MessagesPage'))

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: 'auth', element: <AuthPage /> },
        { path: 'auth/callback', element: <AuthCallbackPage /> },
        { path: 'auth/line', element: <AuthCallbackPage provider="line" /> },
        {
          path: 'onboarding',
          element: (
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          ),
        },
        { path: 'payment/confirm', element: <PaymentConfirmPage /> },
        { path: 'payment/linepay-demo', element: <LinePayDemoPage /> },
        { path: 'app', element: <RequireRole /> },
        {
          path: 'seeker',
          element: (
            <RequireRole role="seeker">
              <SeekerLayout />
            </RequireRole>
          ),
          children: [
            { index: true, element: <HomePage /> },
            { path: 'search', element: <SearchPage /> },
            { path: 'companions/:id', element: <DetailPage /> },
            { path: 'orders', element: <OrderHistoryPage /> },
            { path: 'care-logs', element: <CareLogListPage /> },
            { path: 'messages', element: <MessagesPage /> },
            { path: 'messages/:partnerId', element: <MessagesPage /> },
            { path: 'profile', element: <ProfilePage /> },
            { path: 'profile/family', element: <KinshipSettingsPage /> },
          ],
        },
        {
          path: 'provider',
          element: (
            <RequireRole role="provider">
              <ProviderLayout />
            </RequireRole>
          ),
          children: [
            { index: true, element: <ProviderDashboard /> },
            { path: 'requests', element: <ProviderRequestsPage /> },
            { path: 'schedule', element: <ProviderSchedulePage /> },
            { path: 'messages', element: <MessagesPage /> },
            { path: 'messages/:partnerId', element: <MessagesPage /> },
            { path: 'profile', element: <ProviderProfilePage /> },
          ],
        },
        { path: 'home', element: <Navigate to="/" replace /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
