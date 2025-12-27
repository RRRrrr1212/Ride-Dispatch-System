import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import { adminApi } from '../../api/admin.api';
import type { AuditLog } from '../../types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await adminApi.getAuditLogs();
        if (response.data.success && response.data.data) {
          setLogs(response.data.data.logs);
        }
      } catch (error) {
        console.error('取得日誌失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        審計日誌
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>訂單 ID</TableCell>
                <TableCell>操作</TableCell>
                <TableCell>執行者</TableCell>
                <TableCell>狀態變更</TableCell>
                <TableCell>結果</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.orderId.slice(0, 8)}...</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.actorType}: {log.actorId}</TableCell>
                  <TableCell>
                    {log.previousState || '-'} → {log.newState}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.success ? '成功' : '失敗'}
                      color={log.success ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    沒有日誌資料
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
