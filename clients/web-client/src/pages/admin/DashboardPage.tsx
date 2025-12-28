import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { adminApi } from '../../api/admin.api';

interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
}

function StatCard({ title, value, color = 'primary.main' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    onlineDrivers: 0,
  });

  const fetchStats = async () => {
    try {
      const response = await adminApi.getOrders();
      if (response.data.success && response.data.data) {
        const orders = response.data.data.orders || [];
        const pending = orders.filter((o: any) => o.status === 'PENDING').length;
        const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
        
        setStats({
          totalOrders: orders.length,
          pendingOrders: pending,
          completedOrders: completed,
          onlineDrivers: 0,
        });
      }
    } catch (error) {
      console.error('取得統計失敗:', error);
    }
    
    // 取得司機統計
    try {
      const driversResponse = await adminApi.getDrivers();
      if (driversResponse.data.success && driversResponse.data.data) {
        const drivers = driversResponse.data.data.drivers || [];
        const onlineCount = drivers.filter((d: any) => d.status === 'ONLINE').length;
        setStats(prev => ({ ...prev, onlineDrivers: onlineCount }));
      }
    } catch (error) {
      console.error('取得司機統計失敗:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        儀表板
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px' }}>
          <StatCard title="總訂單數" value={stats.totalOrders} />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <StatCard title="待處理訂單" value={stats.pendingOrders} color="warning.main" />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <StatCard title="已完成訂單" value={stats.completedOrders} color="success.main" />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <StatCard title="上線司機" value={stats.onlineDrivers} color="info.main" />
        </Box>
      </Box>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        快速操作
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 300px' }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
            <CardContent>
              <Typography variant="h6">📋 訂單管理</Typography>
              <Typography color="text.secondary">查看和管理所有訂單</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
            <CardContent>
              <Typography variant="h6">🚗 司機管理</Typography>
              <Typography color="text.secondary">管理司機和車輛</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
