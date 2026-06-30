import { AdminInventoryDashboard } from '@/features/admin-products/components/admin-inventory-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý tồn kho | CommerceFlow',
};

export default function AdminInventoryPage() {
  return <AdminInventoryDashboard />;
}
