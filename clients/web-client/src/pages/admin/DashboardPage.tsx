import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Paper, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '../../api/admin.api';

interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
  prefix?: string;
}

function StatCard({ title, value, color = 'primary.main', prefix }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
          {prefix}{value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    onlineDrivers: 0,
    totalRevenue: 0,         // 總營收（乘客付款）
    platformRevenue: 0,      // 平台抽成收入（20%）
    driverPayout: 0,         // 司機收入（80%）
    activeTrips: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const response = await adminApi.getOrders();
      if (response.data.success && response.data.data) {
        const orders = response.data.data.orders || [];
        
        // 狀態統計
        const pending = orders.filter((o: any) => o.status === 'PENDING').length;
        const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
        const active = orders.filter((o: any) => ['ACCEPTED', 'ONGOING'].includes(o.status)).length;
        
        // 營收計算 (只計算已完成訂單)
        const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED');
        const revenue = completedOrders.reduce((sum: number, o: any) => sum + (o.actualFare || o.fare || 0), 0);
        const driverTotal = completedOrders.reduce((sum: number, o: any) => 
          sum + (o.driverEarnings || (o.actualFare || o.fare || 0) * 0.8), 0);
        const platformTotal = revenue - driverTotal;

        setStats(prev => ({
          ...prev,
          totalOrders: orders.length,
          pendingOrders: pending,
          activeTrips: active,
          completedOrders: completed,
          totalRevenue: Math.round(revenue * 100) / 100,
          platformRevenue: Math.round(platformTotal * 100) / 100,
          driverPayout: Math.round(driverTotal * 100) / 100,
        }));

        // 生成圖表數據 (過去 7 天)
        const days = 7;
        const data = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
          
          // 篩選當天訂單 (簡單比對日期字串)
          const dayOrders = orders.filter((o: any) => {
            const orderDate = new Date(o.createdAt);
            return orderDate.getDate() === d.getDate() && 
                   orderDate.getMonth() === d.getMonth() &&
                   orderDate.getFullYear() === d.getFullYear();
          });

          const dailyRevenue = dayOrders
            .filter((o: any) => o.status === 'COMPLETED')
            .reduce((sum: number, o: any) => sum + (o.fare || 0), 0);

          data.push({
            name: dateStr,
            orders: dayOrders.length,
            revenue: dailyRevenue,
          });
        }
        setChartData(data);
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
    // 設定輪詢更新數據
    const interval = setInterval(fetchStats, 10000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        儀表板
      </Typography>

      {/* 數據卡片區 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
        <StatCard title="總營收（乘客付款）" value={stats.totalRevenue} prefix="$" color="success.main" />
        <StatCard title="平台抽成 (20%)" value={stats.platformRevenue} prefix="$" color="warning.main" />
        <StatCard title="司機收入 (80%)" value={stats.driverPayout} prefix="$" color="info.main" />
        <StatCard title="總訂單數" value={stats.totalOrders} />
        <StatCard title="已完成訂單" value={stats.completedOrders} color="primary.main" />
        <StatCard title="進行中行程" value={stats.activeTrips} color="secondary.main" />
        <StatCard title="待處理訂單" value={stats.pendingOrders} color="error.main" />
        <StatCard title="上線司機" value={stats.onlineDrivers} color="grey.500" />
      </Box>

      {/* 圖表區 */}
      <Paper sx={{ p: 3, bgcolor: '#1a1a1a', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          近 7 日營收趨勢
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="營收" 
                stroke={theme.palette.primary.main} 
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                name="訂單量" 
                stroke={theme.palette.secondary.main} 
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}
