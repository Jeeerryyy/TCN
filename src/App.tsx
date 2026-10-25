/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TableProvider } from './context/TableContext';
import { CafeProvider } from './context/CafeContext';
import { CustomerProvider } from './context/CustomerContext';
import { BillingProvider } from './context/BillingContext';
import { MainLayout } from './components/layout/MainLayout';
import { ActiveNavTab } from './components/layout/SidebarNav';

// Auth Screen
import { LoginScreen } from './features/auth/LoginScreen';

// Feature Views
import { DashboardOverview } from './features/dashboard/DashboardOverview';
import { TableFloorPlan } from './features/tables/TableFloorPlan';
import { TableStudio } from './features/tables/TableStudio';
import { BookingManager } from './features/tables/BookingManager';
import { CafePOS } from './features/cafe/CafePOS';
import { KitchenOrdersView } from './features/cafe/KitchenOrdersView';
import { CustomerList } from './features/crm/CustomerList';
import { TransactionHistory } from './features/billing/TransactionHistory';
import { RevenueReports } from './features/reports/RevenueReports';
import { DatabaseSettings } from './features/admin/DatabaseSettings';
import { ReceiptSettings } from './features/admin/ReceiptSettings';
import { CafeMenuStudio } from './features/cafe/CafeMenuStudio';
import { ShieldAlert } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActiveNavTab>('dashboard');
  const { isAuthenticated, isAdmin } = useAuth();

  // If session is locked / not authenticated, render Login Terminal
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <MainLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'dashboard' && (
        <DashboardOverview onNavigate={(tab) => setCurrentTab(tab)} />
      )}
      {currentTab === 'tables' && (
        <TableFloorPlan onNavigateToCafePOS={() => setCurrentTab('cafe')} />
      )}
      {currentTab === 'table-studio' && (
        isAdmin ? (
          <TableStudio />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
      {currentTab === 'bookings' && <BookingManager />}
      {currentTab === 'cafe' && <CafePOS />}
      {currentTab === 'cafe-studio' && (
        isAdmin ? (
          <CafeMenuStudio />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
      {currentTab === 'kitchen' && <KitchenOrdersView />}
      {currentTab === 'crm' && (
        isAdmin ? (
          <CustomerList />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
      {currentTab === 'billing' && <TransactionHistory />}
      {currentTab === 'reports' && (
        isAdmin ? (
          <RevenueReports />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
      {currentTab === 'receipt-settings' && (
        isAdmin ? (
          <ReceiptSettings />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
      {currentTab === 'database' && (
        isAdmin ? (
          <DatabaseSettings />
        ) : (
          <AccessDeniedNotice onGoBack={() => setCurrentTab('dashboard')} />
        )
      )}
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
  );
};

export default App;
