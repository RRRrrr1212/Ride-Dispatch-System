import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin.api';
import type { Rider } from '../../types';

export function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  
  // 新增乘客表單
  const [newRider, setNewRider] = useState({
    name: '',
    phone: '',
  });

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getRiders();
      if (response.data.success && response.data.data) {
        setRiders(response.data.data.riders);
      }
    } catch (error) {
      console.error('取得乘客列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleCreateRider = async () => {
    if (!newRider.name || !newRider.phone) {
      alert('請填寫所有欄位');
      return;
    }
    
    const riderId = `rider-${newRider.phone}`;

    try {
      const response = await adminApi.createRider({
        riderId,
        name: newRider.name,
        phone: newRider.phone,
      });
      if (response.data.success) {
        alert('乘客建立成功');
        setOpenDialog(false);
        setNewRider({ name: '', phone: '' });
        fetchRiders();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('乘客帳號已存在');
      } else {
        alert('建立失敗');
      }
    }
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!window.confirm(`確定要刪除乘客 ${riderId} 嗎？`)) return;
    
    try {
      await adminApi.deleteRider(riderId);
      alert('乘客已刪除');
      fetchRiders();
    } catch (error) {
      alert('刪除失敗');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">乘客管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRiders}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            新增乘客
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'grey.400' }}>乘客 ID</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>姓名</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>電話</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>建立時間</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : riders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'grey.500' }}>
                  尚無乘客資料
                </TableCell>
              </TableRow>
            ) : (
              riders.map((rider) => (
                <TableRow key={rider.riderId} hover>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip label={rider.riderId} size="small" color="primary" />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{rider.name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{rider.phone}</TableCell>
                  <TableCell sx={{ color: 'grey.400' }}>
                    {new Date(rider.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRider(rider.riderId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增乘客對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>新增乘客</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="手機號碼"
            value={newRider.phone}
            onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            placeholder="例: 0912345678"
          />
          <TextField
            fullWidth
            label="姓名"
            value={newRider.name}
            onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateRider}>建立</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
