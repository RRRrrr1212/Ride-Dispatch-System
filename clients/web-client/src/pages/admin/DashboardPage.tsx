import { Box, Typography, Card, CardContent } from '@mui/material';

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
  // TODO: 從 API 取得統計數據
  const stats = {
    totalOrders: 156,
    pendingOrders: 3,
    completedOrders: 142,
    onlineDrivers: 8,
  };

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
