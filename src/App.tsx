/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TableProvider } from './context/TableContext';
import { CafeProvider } from './context/CafeContext';
import { CustomerProvider } from './context/CustomerContext';
import { BillingProvider } from './context/BillingContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { MainLayout } from './components/layout/MainLayout';
import { ActiveNavTab } from './components/layout/SidebarNav';

// Skeleton Fallbacks
import {
  DashboardSkeleton,
  FloorPlanSkeleton,
  CafePOSSkeleton,
  KitchenOrdersSkeleton,
  CustomerListSkeleton,
  TransactionHistorySkeleton,
  RevenueReportsSkeleton,
  TableStudioSkeleton,
  BookingManagerSkeleton,
} from './components/ui/Skeleton';

// Auth Screen (Eager loaded for immediate security lock)
import { LoginScreen } from './features/auth/LoginScreen';

// Lazy Loaded Feature Views for Instant Initial Hydration & Code Splitting
const DashboardOverview = lazy(() =>
  import('./features/dashboard/DashboardOverview').then((m) => ({ default: m.DashboardOverview }))
);
const TableFloorPlan = lazy(() =>
  import('./features/tables/TableFloorPlan').then((m) => ({ default: m.TableFloorPlan }))
);
const TableStudio = lazy(() =>
  import('./features/tables/TableStudio').then((m) => ({ default: m.TableStudio }))
);
const BookingManager = lazy(() =>
  import('./features/tables/BookingManager').then((m) => ({ default: m.BookingManager }))
);
const CafePOS = lazy(() =>
  import('./features/cafe/CafePOS').then((m) => ({ default: m.CafePOS }))
);
const KitchenOrdersView = lazy(() =>
  import('./features/cafe/KitchenOrdersView').then((m) => ({ default: m.KitchenOrdersView }))
);
const CustomerList = lazy(() =>
  import('./features/crm/CustomerList').then((m) => ({ default: m.CustomerList }))
);
const TransactionHistory = lazy(() =>
  import('./features/billing/TransactionHistory').then((m) => ({ default: m.TransactionHistory }))
);
const RevenueReports = lazy(() =>
  import('./features/reports/RevenueReports').then((m) => ({ default: m.RevenueReports }))
);
const DatabaseSettings = lazy(() =>
  import('./features/admin/DatabaseSettings').then((m) => ({ default: m.DatabaseSettings }))
);
const ReceiptSettings = lazy(() =>
  import('./features/admin/ReceiptSettings').then((m) => ({ default: m.ReceiptSettings }))
);
const CafeMenuStudio = lazy(() =>
  import('./features/cafe/CafeMenuStudio').then((m) => ({ default: m.CafeMenuStudio }))
);
const SecuritySettings = lazy(() =>
  import('./features/admin/SecuritySettings').then((m) => ({ default: m.SecuritySettings }))
);


import { ShieldAlert } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActiveNavTab>('dashboard');
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { info } = useToast();

  // Keyboard navigation shortcuts for power-user staff / cashiers
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setCurrentTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            setCurrentTab('tables');
            break;
          case '3':
            e.preventDefault();
            setCurrentTab('cafe');
            break;
          case '4':
            e.preventDefault();
            setCurrentTab('kitchen');
            break;
          case '5':
            e.preventDefault();
            setCurrentTab('billing');
            break;
          case 'l':
          case 'L':
            e.preventDefault();
            logout();
            info('Terminal session locked', 'Security Lock');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [logout, info]);

  // If session is locked / not authenticated, render Login Terminal
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <MainLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      <ErrorBoundary fallbackTitle={`Error in ${currentTab.toUpperCase()} Panel`}>
        {currentTab === 'dashboard' && (
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardOverview onNavigate={(tab) => setCurrentTab(tab)} />
          </Suspense>
        )}
        {currentTab === 'tables' && (
          <Suspense fallback={<FloorPlanSkeleton />}>
            <TableFloorPlan onNavigateToCafePOS={() => setCurrentTab('cafe')} />
          </Suspense>
        )}
        {currentTab === 'table-studio' &&
          (isAdmin ? (
            <Suspense fallback={<TableStudioSkeleton />}>
              <TableStudio />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'bookings' && (
          <Suspense fallback={<BookingManagerSkeleton />}>
            <BookingManager />
          </Suspense>
        )}
        {currentTab === 'cafe' && (
          <Suspense fallback={<CafePOSSkeleton />}>
            <CafePOS />
          </Suspense>
        )}
        {currentTab === 'cafe-studio' &&
          (isAdmin ? (
            <Suspense fallback={<CafePOSSkeleton />}>
              <CafeMenuStudio />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'kitchen' && (
          <Suspense fallback={<KitchenOrdersSkeleton />}>
            <KitchenOrdersView />
          </Suspense>
        )}
        {currentTab === 'crm' &&
          (isAdmin ? (
            <Suspense fallback={<CustomerListSkeleton />}>
              <CustomerList />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'billing' && (
          <Suspense fallback={<TransactionHistorySkeleton />}>
            <TransactionHistory />
          </Suspense>
        )}
        {currentTab === 'reports' &&
          (isAdmin ? (
            <Suspense fallback={<RevenueReportsSkeleton />}>
              <RevenueReports />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'receipt-settings' &&
          (isAdmin ? (
            <Suspense fallback={<TableStudioSkeleton />}>
              <ReceiptSettings />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'database' &&
          (isAdmin ? (
            <Suspense fallback={<TableStudioSkeleton />}>
              <DatabaseSettings />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
        {currentTab === 'security' &&
          (isAdmin ? (
            <Suspense fallback={<TableStudioSkeleton />}>
              <SecuritySettings />
            </Suspense>
          ) : (
            <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
          ))}
      </ErrorBoundary>
    </MainLayout>
  );
};

const AccessDeniedNotice: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-12 text-center max-w-md mx-auto my-12 space-y-4 shadow-[0px_8px_24px_rgba(0,0,0,0.15)]">
      <div className="w-12 h-12 rounded-[6px] bg-[#FF3D00]/10 text-[#FF3D00] flex items-center justify-center mx-auto border border-[#FF3D00]/20">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-[16px] font-medium text-[#000000]">
        Executive Clearance Required
      </h3>
      <p className="text-[14px] text-[#60646C] leading-relaxed">
        This section is restricted to General Managers and Administrative staff. Please sign in with an Administrator terminal passcode to access this panel.
      </p>
      <button
        type="button"
        onClick={onGoBack}
        className="h-[40px] px-6 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white text-[16px] font-normal transition-colors"
      >
        Return to Floor Operations
      </button>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <TableProvider>
            <CafeProvider>
              <CustomerProvider>
                <BillingProvider>
                  <AppContent />
                </BillingProvider>
              </CustomerProvider>
            </CafeProvider>
          </TableProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
