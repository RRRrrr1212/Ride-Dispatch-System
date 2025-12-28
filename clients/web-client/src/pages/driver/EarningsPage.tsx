import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  EventNote as EventIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../../stores/driver.store';
import { adminApi } from '../../api/admin.api'; // 暫時借用 admin API 來獲取訂單

interface EarningItem {
  id: string;
  date: string;
  amount: number;
  distance: number;
  duration: number;
}

export function EarningsPage() {
  const { driver } = useDriverStore();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!driver) return;
      
      try {
        setLoading(true);
        // FIXME: 這裡暫時獲取所有訂單並在前端過濾，理想情況應有專屬 API
        const response = await adminApi.getOrders();
        
        if (response.data.success && response.data.data) {
          const allOrders = response.data.data.orders || [];
          
          // 過濾出屬於此司機且已完成的訂單
          const myOrders = allOrders
            .filter((o: any) => o.driverId === driver.driverId && o.status === 'COMPLETED')
            .map((o: any) => ({
              id: o.orderId,
              date: o.completedAt,
              amount: o.fare || 0,
              distance: o.estimatedDistance || 0, // 注意：有些 API 欄位名稱可能不同，需對應
              duration: o.duration || 0,
            }))
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());;

          setEarnings(myOrders);
          setTotalAmount(myOrders.reduce((sum: number, item: any) => sum + item.amount, 0));
        }
      } catch (error) {
        console.error('獲取收入資料失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [driver]);

  if (!driver) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography>請先登入</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a', color: 'white' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
        <AttachMoneyIcon sx={{ mr: 1, color: '#4caf50' }} />
        收入概覽
      </Typography>

      {/* 總收入卡片 */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
        color: 'white',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <Typography variant="subtitle1" sx={{ opacity: 0.8, mb: 1 }}>
          總收入
        </Typography>
        <Typography variant="h3" fontWeight="bold">
          ${totalAmount.toLocaleString()}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', opacity: 0.9 }}>
          <TrendingUpIcon sx={{ mr: 0.5 }} />
          <Typography variant="body2">
            共完成 {earnings.length} 筆訂單
          </Typography>
        </Box>
      </Paper>

      {/* 收入列表 */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        最近收入
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#4caf50' }} />
        </Box>
      ) : earnings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#2a2a2a', borderRadius: 2 }}>
          <Typography color="grey.500">尚無收入紀錄</Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: '#2a2a2a', borderRadius: 2, p: 0, overflow: 'hidden' }}>
          {earnings.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />}
              <ListItem sx={{ py: 2 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body1" fontWeight="bold" color="white">
                        訂單 #{item.id.slice(-4)}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="#4caf50">
                        +${item.amount}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, color: 'grey.500', fontSize: '0.875rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <EventIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {new Date(item.date).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.distance > 0 && <span>{item.distance.toFixed(1)} km</span>}
                    </Box>
                  }
                />
              </ListItem>
            </div>
          ))}
        </List>
      )}
    </Box>
  );
}
