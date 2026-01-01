package com.uber.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uber.dto.*;
import com.uber.model.*;
import com.uber.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AdminController 整合測試
 * 
 * Issue #17: 驗證 AdminController REST API 完整性
 */
@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private DriverService driverService;

    @MockitoBean
    private AuditService auditService;

    @MockitoBean
    private FareService fareService;

    @MockitoBean
    private RiderService riderService;

    @MockitoBean
    private ValidationService validationService;

    private Order sampleOrder;
    private Driver sampleDriver;
    private AuditLog sampleAuditLog;
    private RatePlan sampleRatePlan;

    @BeforeEach
    void setUp() {
        sampleOrder = Order.builder()
                .orderId("order-123")
                .passengerId("passenger-001")
                .driverId("driver-456")
                .status(OrderStatus.COMPLETED)
                .vehicleType(VehicleType.STANDARD)
                .pickupLocation(new Location(25.5, 30.2))
                .dropoffLocation(new Location(45.8, 60.1))
                .estimatedFare(150.00)
                .actualFare(185.50)
                .distance(8.5)
                .duration(15)
                .createdAt(Instant.now().minusSeconds(3600))
                .acceptedAt(Instant.now().minusSeconds(3500))
                .startedAt(Instant.now().minusSeconds(3400))
                .completedAt(Instant.now())
                .build();

        sampleDriver = Driver.builder()
                .driverId("driver-456")
                .name("王大明")
                .phone("0912-345-678")
                .vehiclePlate("ABC-1234")
                .vehicleType(VehicleType.STANDARD)
                .status(DriverStatus.OFFLINE)
                .busy(false)
                .lastUpdatedAt(Instant.now())
                .build();

        sampleAuditLog = AuditLog.builder()
                .id("audit-001")
                .timestamp(Instant.now())
                .orderId("order-123")
                .action("ACCEPT")
                .actorType("DRIVER")
                .actorId("driver-456")
                .previousState("PENDING")
                .newState("ACCEPTED")
                .success(true)
                .build();

        sampleRatePlan = RatePlan.builder()
                .vehicleType(VehicleType.STANDARD)
                .baseFare(50.0)
                .perKmRate(15.0)
                .perMinRate(3.0)
                .minFare(70.0)
                .cancelFee(30.0)
                .build();
    }

    @Nested
    @DisplayName("GET /api/admin/orders - 取得所有訂單")
    class GetAllOrdersTests {

        @Test
        @DisplayName("成功取得所有訂單含分頁資訊")
        void getAllOrders_Success() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders").isArray())
                    .andExpect(jsonPath("$.data.orders[0].orderId").value("order-123"))
                    .andExpect(jsonPath("$.data.pagination.page").value(0))
                    .andExpect(jsonPath("$.data.pagination.size").value(20))
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(1));
        }

        @Test
        @DisplayName("支援狀態篩選")
        void getAllOrders_WithStatusFilter() throws Exception {
            Order pendingOrder = Order.builder()
                    .orderId("order-pending")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder, pendingOrder));

            mockMvc.perform(get("/api/admin/orders")
                            .param("status", "COMPLETED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(1));
        }

        @Test
        @DisplayName("無效狀態參數時忽略篩選")
        void getAllOrders_WithInvalidStatus() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));

            mockMvc.perform(get("/api/admin/orders")
                            .param("status", "INVALID_STATUS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(1));
        }

        @Test
        @DisplayName("空字串狀態參數時忽略篩選")
        void getAllOrders_WithEmptyStatus() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));

            mockMvc.perform(get("/api/admin/orders")
                            .param("status", ""))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(1));
        }

        @Test
        @DisplayName("訂單列表為空時分頁正確")
        void getAllOrders_EmptyList() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of());

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders").isEmpty())
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(0))
                    .andExpect(jsonPath("$.data.pagination.totalPages").value(0));
        }

        @Test
        @DisplayName("分頁超出範圍時回傳空列表")
        void getAllOrders_PageOutOfBounds() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));

            mockMvc.perform(get("/api/admin/orders")
                            .param("page", "10")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders").isEmpty())
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(1));
        }

        @Test
        @DisplayName("支援分頁")
        void getAllOrders_WithPagination() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));

            mockMvc.perform(get("/api/admin/orders")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.pagination.page").value(0))
                    .andExpect(jsonPath("$.data.pagination.size").value(10));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/orders/{orderId} - 取得訂單詳情")
    class GetOrderDetailTests {

        @Test
        @DisplayName("成功取得訂單詳情")
        void getOrderDetail_Success() throws Exception {
            when(orderService.getOrder("order-123")).thenReturn(sampleOrder);

            mockMvc.perform(get("/api/admin/orders/order-123"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orderId").value("order-123"))
                    .andExpect(jsonPath("$.data.pickupLocation").exists())
                    .andExpect(jsonPath("$.data.dropoffLocation").exists());
        }

        @Test
        @DisplayName("訂單無司機時不包含driverId欄位")
        void getOrderDetail_WithoutDriver() throws Exception {
            Order orderWithoutDriver = Order.builder()
                    .orderId("order-no-driver")
                    .passengerId("passenger-001")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-driver")).thenReturn(orderWithoutDriver);

            mockMvc.perform(get("/api/admin/orders/order-no-driver"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.driverId").doesNotExist())
                    .andExpect(jsonPath("$.data.fare").doesNotExist())
                    .andExpect(jsonPath("$.data.duration").doesNotExist());
        }

        @Test
        @DisplayName("已取消訂單包含取消資訊")
        void getOrderDetail_CancelledOrder() throws Exception {
            Order cancelledOrder = Order.builder()
                    .orderId("order-cancelled")
                    .passengerId("passenger-001")
                    .driverId("driver-456")
                    .status(OrderStatus.CANCELLED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .cancelledAt(Instant.now())
                    .cancelledBy("passenger-001")
                    .cancelFee(30.0)
                    .build();

            when(orderService.getOrder("order-cancelled")).thenReturn(cancelledOrder);

            mockMvc.perform(get("/api/admin/orders/order-cancelled"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.cancelledAt").exists())
                    .andExpect(jsonPath("$.data.cancelledBy").value("passenger-001"))
                    .andExpect(jsonPath("$.data.cancelFee").value(30.0));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/drivers - 取得所有司機")
    class GetAllDriversTests {

        @Test
        @DisplayName("成功取得所有司機")
        void getAllDrivers_Success() throws Exception {
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.drivers").isArray())
                    .andExpect(jsonPath("$.data.drivers[0].driverId").value("driver-456"))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("支援狀態篩選")
        void getAllDrivers_WithStatusFilter() throws Exception {
            Driver onlineDriver = Driver.builder()
                    .driverId("driver-online")
                    .name("線上司機")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .lastUpdatedAt(Instant.now())
                    .build();

            Driver offlineDriver = Driver.builder()
                    .driverId("driver-offline")
                    .name("離線司機")
                    .status(DriverStatus.OFFLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(onlineDriver, offlineDriver));

            mockMvc.perform(get("/api/admin/drivers")
                            .param("status", "ONLINE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("無效狀態參數時忽略篩選")
        void getAllDrivers_WithInvalidStatus() throws Exception {
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/drivers")
                            .param("status", "INVALID_STATUS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("空字串狀態參數時忽略篩選")
        void getAllDrivers_WithEmptyStatus() throws Exception {
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/drivers")
                            .param("status", ""))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("司機無選填欄位時正確處理")
        void getAllDrivers_WithMinimalFields() throws Exception {
            Driver minimalDriver = Driver.builder()
                    .driverId("driver-minimal")
                    .name("最小司機")
                    .status(DriverStatus.OFFLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(minimalDriver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.drivers[0].phone").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].vehiclePlate").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].location").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].currentOrderId").doesNotExist());
        }
    }

    @Nested
    @DisplayName("GET /api/admin/audit-logs - 取得 Audit Log")
    class GetAuditLogsTests {

        @Test
        @DisplayName("成功取得所有 Audit Log")
        void getAuditLogs_Success() throws Exception {
            when(auditService.getAllLogs()).thenReturn(List.of(sampleAuditLog));

            mockMvc.perform(get("/api/admin/audit-logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.logs").isArray())
                    .andExpect(jsonPath("$.data.logs[0].orderId").value("order-123"))
                    .andExpect(jsonPath("$.data.logs[0].action").value("ACCEPT"))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("支援 orderId 篩選")
        void getAuditLogs_WithOrderIdFilter() throws Exception {
            when(auditService.getLogsByOrderId("order-123")).thenReturn(List.of(sampleAuditLog));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("orderId", "order-123"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.logs[0].orderId").value("order-123"));
        }

        @Test
        @DisplayName("空字串 orderId 時查詢所有 log")
        void getAuditLogs_WithEmptyOrderId() throws Exception {
            when(auditService.getAllLogs()).thenReturn(List.of(sampleAuditLog));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("orderId", ""))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("支援 action 篩選")
        void getAuditLogs_WithActionFilter() throws Exception {
            AuditLog createLog = AuditLog.builder()
                    .id("audit-002")
                    .action("CREATE")
                    .orderId("order-123")
                    .build();

            when(auditService.getAllLogs()).thenReturn(List.of(sampleAuditLog, createLog));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("action", "ACCEPT"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("空字串 action 時不篩選")
        void getAuditLogs_WithEmptyAction() throws Exception {
            when(auditService.getAllLogs()).thenReturn(List.of(sampleAuditLog));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("action", ""))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.count").value(1));
        }

        @Test
        @DisplayName("失敗的 audit log 包含 failureReason")
        void getAuditLogs_WithFailureReason() throws Exception {
            AuditLog failedLog = AuditLog.builder()
                    .id("audit-failed")
                    .timestamp(Instant.now())
                    .orderId("order-123")
                    .action("ACCEPT")
                    .actorType("DRIVER")
                    .actorId("driver-789")
                    .previousState("PENDING")
                    .newState("PENDING")
                    .success(false)
                    .failureReason("Order already accepted")
                    .build();

            when(auditService.getAllLogs()).thenReturn(List.of(failedLog));

            mockMvc.perform(get("/api/admin/audit-logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.logs[0].failureReason").value("Order already accepted"));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/accept-stats/{orderId} - 取得搶單統計")
    class GetAcceptStatsTests {

        @Test
        @DisplayName("成功取得搶單統計")
        void getAcceptStats_Success() throws Exception {
            Map<String, Long> stats = Map.of(
                    "totalAttempts", 5L,
                    "successCount", 1L,
                    "failureCount", 4L
            );
            when(auditService.getAcceptStats("order-123")).thenReturn(stats);

            mockMvc.perform(get("/api/admin/accept-stats/order-123"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.totalAttempts").value(5))
                    .andExpect(jsonPath("$.data.successCount").value(1));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/rate-plans - 取得費率設定")
    class GetRatePlansTests {

        @Test
        @DisplayName("成功取得所有費率")
        void getRatePlans_Success() throws Exception {
            when(fareService.getAllRatePlans()).thenReturn(List.of(sampleRatePlan));

            mockMvc.perform(get("/api/admin/rate-plans"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.ratePlans").isArray())
                    .andExpect(jsonPath("$.data.ratePlans[0].vehicleType").value("STANDARD"))
                    .andExpect(jsonPath("$.data.ratePlans[0].baseFare").value(50.0));
        }
    }

    @Nested
    @DisplayName("PUT /api/admin/rate-plans/{vehicleType} - 更新費率設定")
    class UpdateRatePlanTests {

        @Test
        @DisplayName("成功更新費率")
        void updateRatePlan_Success() throws Exception {
            RatePlan updatedPlan = RatePlan.builder()
                    .vehicleType(VehicleType.STANDARD)
                    .baseFare(55.0)
                    .perKmRate(16.0)
                    .perMinRate(3.5)
                    .minFare(75.0)
                    .cancelFee(35.0)
                    .build();

            when(fareService.updateRatePlan(eq(VehicleType.STANDARD), any(RatePlan.class)))
                    .thenReturn(updatedPlan);

            mockMvc.perform(put("/api/admin/rate-plans/STANDARD")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updatedPlan)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.vehicleType").value("STANDARD"))
                    .andExpect(jsonPath("$.data.baseFare").value(55.0))
                    .andExpect(jsonPath("$.data.updatedAt").exists());
        }
    }

    @Nested
    @DisplayName("GET /api/admin/stats - 系統統計數據")
    class GetSystemStatsTests {

        @Test
        @DisplayName("成功取得系統統計數據")
        void getSystemStats_Success() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(sampleOrder));
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders.total").value(1))
                    .andExpect(jsonPath("$.data.orders.completed").value(1))
                    .andExpect(jsonPath("$.data.drivers.total").value(1))
                    .andExpect(jsonPath("$.data.totalRevenue").value(185.50))
                    .andExpect(jsonPath("$.data.generatedAt").exists());
        }

        @Test
        @DisplayName("多個訂單統計分類正確")
        void getSystemStats_MultipleOrders() throws Exception {
            Order pendingOrder = Order.builder()
                    .orderId("order-pending")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            Order acceptedOrder = Order.builder()
                    .orderId("order-accepted")
                    .status(OrderStatus.ACCEPTED)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            Order cancelledOrder = Order.builder()
                    .orderId("order-cancelled")
                    .status(OrderStatus.CANCELLED)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .cancelFee(30.0)
                    .build();

            when(orderService.getAllOrders()).thenReturn(
                    List.of(sampleOrder, pendingOrder, acceptedOrder, cancelledOrder));
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders.total").value(4))
                    .andExpect(jsonPath("$.data.orders.pending").value(1))
                    .andExpect(jsonPath("$.data.orders.accepted").value(1))
                    .andExpect(jsonPath("$.data.orders.cancelled").value(1));
        }

        @Test
        @DisplayName("空訂單和司機列表的統計")
        void getSystemStats_EmptyLists() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of());
            when(driverService.getAllDrivers()).thenReturn(List.of());

            mockMvc.perform(get("/api/admin/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orders.total").value(0))
                    .andExpect(jsonPath("$.data.drivers.total").value(0))
                    .andExpect(jsonPath("$.data.totalRevenue").value(0.0));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/orders 邊界和異常情況")
    class GetAllOrdersEdgeCasesTests {

        @Test
        @DisplayName("大分頁 size 時正確切分")
        void getAllOrders_LargePageSize() throws Exception {
            List<Order> orders = new java.util.ArrayList<>();
            for (int i = 0; i < 100; i++) {
                orders.add(Order.builder()
                        .orderId("order-" + i)
                        .status(OrderStatus.COMPLETED)
                        .vehicleType(VehicleType.STANDARD)
                        .build());
            }
            when(orderService.getAllOrders()).thenReturn(orders);

            mockMvc.perform(get("/api/admin/orders")
                            .param("page", "0")
                            .param("size", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders.length()").value(50))
                    .andExpect(jsonPath("$.data.pagination.totalPages").value(2));
        }

        @Test
        @DisplayName("多種狀態訂單篩選")
        void getAllOrders_MultipleStatusFilter() throws Exception {
            Order completed1 = Order.builder()
                    .orderId("order-c1")
                    .status(OrderStatus.COMPLETED)
                    .vehicleType(VehicleType.STANDARD)
                    .build();
            Order completed2 = Order.builder()
                    .orderId("order-c2")
                    .status(OrderStatus.COMPLETED)
                    .vehicleType(VehicleType.PREMIUM)
                    .build();
            Order pending = Order.builder()
                    .orderId("order-p1")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .build();

            when(orderService.getAllOrders()).thenReturn(
                    List.of(completed1, completed2, pending));

            mockMvc.perform(get("/api/admin/orders")
                            .param("status", "COMPLETED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.pagination.totalElements").value(2));
        }

        @Test
        @DisplayName("分頁邊界測試 - 最後一頁有少於 size 的元素")
        void getAllOrders_LastPagePartial() throws Exception {
            List<Order> orders = new java.util.ArrayList<>();
            for (int i = 0; i < 25; i++) {
                orders.add(Order.builder()
                        .orderId("order-" + i)
                        .status(OrderStatus.COMPLETED)
                        .vehicleType(VehicleType.STANDARD)
                        .build());
            }
            when(orderService.getAllOrders()).thenReturn(orders);

            mockMvc.perform(get("/api/admin/orders")
                            .param("page", "1")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders.length()").value(5))
                    .andExpect(jsonPath("$.data.pagination.totalPages").value(2));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/drivers 邊界和異常情況")
    class GetAllDriversEdgeCasesTests {

        @Test
        @DisplayName("多種狀態司機篩選結果")
        void getAllDrivers_MixedStatusFilter() throws Exception {
            Driver online1 = Driver.builder()
                    .driverId("driver-online1")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .lastUpdatedAt(Instant.now())
                    .build();
            Driver online2 = Driver.builder()
                    .driverId("driver-online2")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.PREMIUM)
                    .lastUpdatedAt(Instant.now())
                    .build();
            Driver offline = Driver.builder()
                    .driverId("driver-offline")
                    .status(DriverStatus.OFFLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(
                    List.of(online1, online2, offline));

            mockMvc.perform(get("/api/admin/drivers")
                            .param("status", "ONLINE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.count").value(2));
        }

        @Test
        @DisplayName("司機狀態為 null 時不出現異常")
        void getAllDrivers_NoStatusParam() throws Exception {
            when(driverService.getAllDrivers()).thenReturn(List.of(sampleDriver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.count").value(1));
        }
    }

    @Nested
    @DisplayName("GET /api/admin/audit-logs 邊界和異常情況")
    class GetAuditLogsEdgeCasesTests {

        @Test
        @DisplayName("多個 log 記錄篩選")
        void getAuditLogs_MultipleLogsFilter() throws Exception {
            AuditLog log1 = AuditLog.builder()
                    .id("audit-1")
                    .orderId("order-123")
                    .action("ACCEPT")
                    .build();
            AuditLog log2 = AuditLog.builder()
                    .id("audit-2")
                    .orderId("order-123")
                    .action("START")
                    .build();
            AuditLog log3 = AuditLog.builder()
                    .id("audit-3")
                    .orderId("order-456")
                    .action("ACCEPT")
                    .build();

            when(auditService.getAllLogs()).thenReturn(List.of(log1, log2, log3));
            when(auditService.getLogsByOrderId("order-123")).thenReturn(List.of(log1, log2));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("orderId", "order-123"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.count").value(2));
        }

        @Test
        @DisplayName("action 和 orderId 都提供時，orderId 優先")
        void getAuditLogs_BothFiltersProvided() throws Exception {
            AuditLog log = AuditLog.builder()
                    .id("audit-1")
                    .orderId("order-123")
                    .action("ACCEPT")
                    .build();

            when(auditService.getLogsByOrderId("order-123")).thenReturn(List.of(log));

            mockMvc.perform(get("/api/admin/audit-logs")
                            .param("orderId", "order-123")
                            .param("action", "START"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("沒有任何篩選條件時返回全部 log")
        void getAuditLogs_NoFilters() throws Exception {
            when(auditService.getAllLogs()).thenReturn(List.of(sampleAuditLog));

            mockMvc.perform(get("/api/admin/audit-logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.count").value(1));
        }
    }

    @Nested
    @DisplayName("Rate Plan 操作邊界和異常")
    class RatePlanEdgeCasesTests {

        @Test
        @DisplayName("更新費率時正確返回更新時間")
        void updateRatePlan_WithTimestamp() throws Exception {
            RatePlan updatedPlan = RatePlan.builder()
                    .vehicleType(VehicleType.STANDARD)
                    .baseFare(55.0)
                    .perKmRate(16.0)
                    .perMinRate(3.5)
                    .minFare(75.0)
                    .cancelFee(35.0)
                    .build();

            when(fareService.updateRatePlan(eq(VehicleType.STANDARD), any(RatePlan.class)))
                    .thenReturn(updatedPlan);

            mockMvc.perform(put("/api/admin/rate-plans/STANDARD")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updatedPlan)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.updatedAt").exists());
        }

        @Test
        @DisplayName("多個車種的費率更新")
        void getRatePlans_MultipleVehicleTypes() throws Exception {
            RatePlan standardPlan = RatePlan.builder()
                    .vehicleType(VehicleType.STANDARD)
                    .baseFare(50.0)
                    .perKmRate(15.0)
                    .build();

            RatePlan premiumPlan = RatePlan.builder()
                    .vehicleType(VehicleType.PREMIUM)
                    .baseFare(75.0)
                    .perKmRate(20.0)
                    .build();

            when(fareService.getAllRatePlans()).thenReturn(List.of(standardPlan, premiumPlan));

            mockMvc.perform(get("/api/admin/rate-plans"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.ratePlans.length()").value(2));
        }
    }

    @Nested
    @DisplayName("訂單詳情邊界情況")
    class GetOrderDetailEdgeCasesTests {

        @Test
        @DisplayName("待處理訂單不包含完成相關字段")
        void getOrderDetail_PendingOrderMinimalFields() throws Exception {
            Order pendingOrder = Order.builder()
                    .orderId("order-pending")
                    .passengerId("passenger-001")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-pending")).thenReturn(pendingOrder);

            mockMvc.perform(get("/api/admin/orders/order-pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.driverId").doesNotExist())
                    .andExpect(jsonPath("$.data.acceptedAt").doesNotExist())
                    .andExpect(jsonPath("$.data.startedAt").doesNotExist())
                    .andExpect(jsonPath("$.data.completedAt").doesNotExist());
        }

        @Test
        @DisplayName("接單狀態訂單不包含完成字段")
        void getOrderDetail_AcceptedOrderFields() throws Exception {
            Order acceptedOrder = Order.builder()
                    .orderId("order-accepted")
                    .passengerId("passenger-001")
                    .driverId("driver-456")
                    .status(OrderStatus.ACCEPTED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .acceptedAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-accepted")).thenReturn(acceptedOrder);

            mockMvc.perform(get("/api/admin/orders/order-accepted"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.startedAt").doesNotExist())
                    .andExpect(jsonPath("$.data.completedAt").doesNotExist());
        }
    }

    @Nested
    @DisplayName("錯誤路徑與例外處理")
    class ErrorResponsesTests {

        @Test
        @DisplayName("當 orderService 發生未預期例外時回傳 5xx")
        void getAllOrders_ServiceThrowsRuntimeException() throws Exception {
            when(orderService.getAllOrders()).thenThrow(new RuntimeException("unexpected"));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().is5xxServerError());
        }

        @Test
        @DisplayName("當 driverService 發生未預期例外時回傳 5xx")
        void getAllDrivers_ServiceThrowsRuntimeException() throws Exception {
            when(driverService.getAllDrivers()).thenThrow(new RuntimeException("boom"));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().is5xxServerError());
        }

        @Test
        @DisplayName("當 fareService.updateRatePlan 發生未預期例外時回傳 5xx")
        void updateRatePlan_ServiceThrowsRuntimeException() throws Exception {
            RatePlan updatedPlan = RatePlan.builder()
                    .vehicleType(VehicleType.STANDARD)
                    .baseFare(55.0)
                    .build();

            when(fareService.updateRatePlan(eq(VehicleType.STANDARD), any(RatePlan.class)))
                    .thenThrow(new RuntimeException("update failed"));

            mockMvc.perform(put("/api/admin/rate-plans/STANDARD")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updatedPlan)))
                    .andExpect(status().is5xxServerError());
        }
    }

    @Nested
    @DisplayName("buildOrderSummary 全分支測試")
    class BuildOrderSummaryTests {

        @Test
        @DisplayName("訂單各字段都為空時的處理")
        void testBuildOrderSummary_AllFieldsNull() throws Exception {
            Order minimalOrder = Order.builder()
                    .orderId("order-min")
                    .passengerId("passenger-001")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(minimalOrder));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders[0].orderId").value("order-min"))
                    .andExpect(jsonPath("$.data.orders[0].driverId").doesNotExist());
        }

        @Test
        @DisplayName("只有driverId，其他字段為空")
        void testBuildOrderSummary_OnlyDriverId() throws Exception {
            Order orderWithDriver = Order.builder()
                    .orderId("order-driver")
                    .passengerId("passenger-001")
                    .driverId("driver-789")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(orderWithDriver));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders[0].driverId").value("driver-789"))
                    .andExpect(jsonPath("$.data.orders[0].fare").doesNotExist());
        }

        @Test
        @DisplayName("fare > 0 時顯示，否則不顯示")
        void testBuildOrderSummary_FareZero() throws Exception {
            Order orderZeroFare = Order.builder()
                    .orderId("order-zero")
                    .passengerId("passenger-001")
                    .status(OrderStatus.COMPLETED)
                    .vehicleType(VehicleType.STANDARD)
                    .actualFare(0.0)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(orderZeroFare));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders[0].fare").doesNotExist());
        }
    }

    @Nested
    @DisplayName("buildDriverSummary 全分支測試")
    class BuildDriverSummaryTests {

        @Test
        @DisplayName("司機所有可選字段都為空")
        void testBuildDriverSummary_AllOptionalFieldsNull() throws Exception {
            Driver minimalDriver = Driver.builder()
                    .driverId("driver-min")
                    .name("Minimal Driver")
                    .status(DriverStatus.OFFLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(minimalDriver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].driverId").value("driver-min"))
                    .andExpect(jsonPath("$.data.drivers[0].phone").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].vehiclePlate").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].location").doesNotExist())
                    .andExpect(jsonPath("$.data.drivers[0].currentOrderId").doesNotExist());
        }

        @Test
        @DisplayName("司機有phone但無其他字段")
        void testBuildDriverSummary_OnlyPhone() throws Exception {
            Driver driverPhone = Driver.builder()
                    .driverId("driver-phone")
                    .name("Phone Driver")
                    .phone("0912-345-678")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driverPhone));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].phone").value("0912-345-678"))
                    .andExpect(jsonPath("$.data.drivers[0].vehiclePlate").doesNotExist());
        }

        @Test
        @DisplayName("司機有location但currentOrderId為空")
        void testBuildDriverSummary_LocationNoOrder() throws Exception {
            Driver driverLoc = Driver.builder()
                    .driverId("driver-loc")
                    .name("Location Driver")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .location(new Location(25.0, 30.0))
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driverLoc));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].location").exists())
                    .andExpect(jsonPath("$.data.drivers[0].currentOrderId").doesNotExist());
        }
    }

    @Nested
    @DisplayName("buildAuditLogResponse failureReason 分支測試")
    class BuildAuditLogResponseTests {

        @Test
        @DisplayName("audit log 沒有 failureReason")
        void testAuditLogNoReason() throws Exception {
            AuditLog successLog = AuditLog.builder()
                    .id("audit-success")
                    .timestamp(Instant.now())
                    .orderId("order-123")
                    .action("ACCEPT")
                    .actorType("DRIVER")
                    .actorId("driver-456")
                    .previousState("PENDING")
                    .newState("ACCEPTED")
                    .success(true)
                    .build();

            when(auditService.getAllLogs()).thenReturn(List.of(successLog));

            mockMvc.perform(get("/api/admin/audit-logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.logs[0].failureReason").doesNotExist());
        }

        @Test
        @DisplayName("audit log 有 failureReason")
        void testAuditLogWithReason() throws Exception {
            AuditLog failLog = AuditLog.builder()
                    .id("audit-fail")
                    .timestamp(Instant.now())
                    .orderId("order-123")
                    .action("ACCEPT")
                    .actorType("DRIVER")
                    .actorId("driver-456")
                    .previousState("PENDING")
                    .newState("PENDING")
                    .success(false)
                    .failureReason("Driver offline")
                    .build();

            when(auditService.getAllLogs()).thenReturn(List.of(failLog));

            mockMvc.perform(get("/api/admin/audit-logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.logs[0].failureReason").value("Driver offline"));
        }
    }

    @Nested
    @DisplayName("buildOrderDetail 額外分支測試")
    class BuildOrderDetailTests {

        @Test
        @DisplayName("訂單所有可選字段都有值")
        void testOrderDetailAllFields() throws Exception {
            Order fullOrder = Order.builder()
                    .orderId("order-full")
                    .passengerId("passenger-001")
                    .driverId("driver-456")
                    .status(OrderStatus.COMPLETED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .actualFare(185.50)
                    .distance(8.5)
                    .duration(15)
                    .createdAt(Instant.now().minusSeconds(3600))
                    .acceptedAt(Instant.now().minusSeconds(3500))
                    .startedAt(Instant.now().minusSeconds(100))
                    .completedAt(Instant.now())
                    .cancelFee(50.0)
                    .cancelledBy("driver-456")
                    .build();

            when(orderService.getOrder("order-full")).thenReturn(fullOrder);

            mockMvc.perform(get("/api/admin/orders/order-full"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.acceptedAt").exists())
                    .andExpect(jsonPath("$.data.startedAt").exists())
                    .andExpect(jsonPath("$.data.duration").value(15))
                    .andExpect(jsonPath("$.data.cancelFee").value(50.0))
                    .andExpect(jsonPath("$.data.cancelledBy").value("driver-456"));
        }

        @Test
        @DisplayName("訂單 duration 為 0 時不顯示")
        void testOrderDetailZeroDuration() throws Exception {
            Order noDurationOrder = Order.builder()
                    .orderId("order-nodur")
                    .passengerId("passenger-001")
                    .status(OrderStatus.ONGOING)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .duration(0)
                    .createdAt(Instant.now())
                    .acceptedAt(Instant.now())
                    .startedAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-nodur")).thenReturn(noDurationOrder);

            mockMvc.perform(get("/api/admin/orders/order-nodur"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.duration").doesNotExist());
        }

        @Test
        @DisplayName("訂單 cancelFee 為 0 時不顯示")
        void testOrderDetailZeroCancelFee() throws Exception {
            Order noCancelFeeOrder = Order.builder()
                    .orderId("order-nocfee")
                    .passengerId("passenger-001")
                    .status(OrderStatus.CANCELLED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .cancelledAt(Instant.now())
                    .cancelledBy("passenger-001")
                    .cancelFee(0.0)
                    .build();

            when(orderService.getOrder("order-nocfee")).thenReturn(noCancelFeeOrder);

            mockMvc.perform(get("/api/admin/orders/order-nocfee"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.cancelFee").doesNotExist());
        }
    }

    @Nested
    @DisplayName("RatePlan 回應建構")
    class RatePlanResponseTests {

        @Test
        @DisplayName("buildRatePlanResponse 各欄位都有值")
        void testBuildRatePlanResponse_AllFields() throws Exception {
            RatePlan plan = RatePlan.builder()
                    .vehicleType(VehicleType.STANDARD)
                    .baseFare(50.0)
                    .perKmRate(15.0)
                    .perMinRate(3.0)
                    .minFare(70.0)
                    .cancelFee(30.0)
                    .build();

            when(fareService.getAllRatePlans()).thenReturn(List.of(plan));

            mockMvc.perform(get("/api/admin/rate-plans"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.ratePlans[0].vehicleType").value("STANDARD"))
                    .andExpect(jsonPath("$.data.ratePlans[0].baseFare").value(50.0))
                    .andExpect(jsonPath("$.data.ratePlans[0].perKmRate").value(15.0))
                    .andExpect(jsonPath("$.data.ratePlans[0].perMinRate").value(3.0))
                    .andExpect(jsonPath("$.data.ratePlans[0].minFare").value(70.0))
                    .andExpect(jsonPath("$.data.ratePlans[0].cancelFee").value(30.0));
        }

        @Test
        @DisplayName("PREMIUM 車種的費率計劃")
        void testBuildRatePlanResponse_Premium() throws Exception {
            RatePlan plan = RatePlan.builder()
                    .vehicleType(VehicleType.PREMIUM)
                    .baseFare(75.0)
                    .perKmRate(20.0)
                    .perMinRate(4.0)
                    .minFare(100.0)
                    .cancelFee(50.0)
                    .build();

            when(fareService.getAllRatePlans()).thenReturn(List.of(plan));

            mockMvc.perform(get("/api/admin/rate-plans"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.ratePlans[0].vehicleType").value("PREMIUM"));
        }
    }

    @Nested
    @DisplayName("訂單摘要額外邊界測試")
    class OrderSummaryAdditionalTests {

        @Test
        @DisplayName("actualFare 正好等於 0")
        void testBuildOrderSummary_ActualFareExactlyZero() throws Exception {
            Order order = Order.builder()
                    .orderId("order-zero-fare")
                    .passengerId("passenger-001")
                    .status(OrderStatus.COMPLETED)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .actualFare(0.0)
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(order));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    // actualFare 為 0 時不顯示
                    .andExpect(jsonPath("$.data.orders[0].fare").doesNotExist());
        }

        @Test
        @DisplayName("completedAt 為 null")
        void testBuildOrderSummary_NoCompletedAt() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-completed")
                    .passengerId("passenger-001")
                    .status(OrderStatus.ONGOING)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(order));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders[0].completedAt").doesNotExist());
        }

        @Test
        @DisplayName("cancelledAt 為 null")
        void testBuildOrderSummary_NoCancelledAt() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-cancelled")
                    .passengerId("passenger-001")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getAllOrders()).thenReturn(List.of(order));

            mockMvc.perform(get("/api/admin/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.orders[0].cancelledAt").doesNotExist());
        }
    }

    @Nested
    @DisplayName("訂單詳情額外邊界測試")
    class OrderDetailAdditionalTests {

        @Test
        @DisplayName("acceptedAt 為 null")
        void testBuildOrderDetail_NoAcceptedAt() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-accepted")
                    .passengerId("passenger-001")
                    .status(OrderStatus.PENDING)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-accepted")).thenReturn(order);

            mockMvc.perform(get("/api/admin/orders/order-no-accepted"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.acceptedAt").doesNotExist());
        }

        @Test
        @DisplayName("startedAt 為 null")
        void testBuildOrderDetail_NoStartedAt() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-started")
                    .passengerId("passenger-001")
                    .status(OrderStatus.ACCEPTED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .acceptedAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-started")).thenReturn(order);

            mockMvc.perform(get("/api/admin/orders/order-no-started"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.startedAt").doesNotExist());
        }

        @Test
        @DisplayName("duration 為 null")
        void testBuildOrderDetail_NoDuration() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-duration")
                    .passengerId("passenger-001")
                    .status(OrderStatus.ONGOING)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .acceptedAt(Instant.now())
                    .startedAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-duration")).thenReturn(order);

            mockMvc.perform(get("/api/admin/orders/order-no-duration"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.duration").doesNotExist());
        }

        @Test
        @DisplayName("cancelFee 為 null")
        void testBuildOrderDetail_NoCancelFee() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-cancel-fee")
                    .passengerId("passenger-001")
                    .status(OrderStatus.CANCELLED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .cancelledAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-cancel-fee")).thenReturn(order);

            mockMvc.perform(get("/api/admin/orders/order-no-cancel-fee"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.cancelFee").doesNotExist());
        }

        @Test
        @DisplayName("cancelledBy 為 null")
        void testBuildOrderDetail_NoCancelledBy() throws Exception {
            Order order = Order.builder()
                    .orderId("order-no-cancelled-by")
                    .passengerId("passenger-001")
                    .status(OrderStatus.CANCELLED)
                    .vehicleType(VehicleType.STANDARD)
                    .pickupLocation(new Location(25.5, 30.2))
                    .dropoffLocation(new Location(45.8, 60.1))
                    .estimatedFare(150.00)
                    .distance(8.5)
                    .createdAt(Instant.now())
                    .cancelledAt(Instant.now())
                    .build();

            when(orderService.getOrder("order-no-cancelled-by")).thenReturn(order);

            mockMvc.perform(get("/api/admin/orders/order-no-cancelled-by"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.cancelledBy").doesNotExist());
        }
    }

    @Nested
    @DisplayName("司機摘要額外邊界測試")
    class DriverSummaryAdditionalTests {

        @Test
        @DisplayName("phone 為 null")
        void testBuildDriverSummary_NoPhone() throws Exception {
            Driver driver = Driver.builder()
                    .driverId("driver-no-phone")
                    .name("No Phone Driver")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].phone").doesNotExist());
        }

        @Test
        @DisplayName("vehiclePlate 為 null")
        void testBuildDriverSummary_NoVehiclePlate() throws Exception {
            Driver driver = Driver.builder()
                    .driverId("driver-no-plate")
                    .name("No Plate Driver")
                    .phone("0912-345-678")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].vehiclePlate").doesNotExist());
        }

        @Test
        @DisplayName("location 為 null")
        void testBuildDriverSummary_NoLocation() throws Exception {
            Driver driver = Driver.builder()
                    .driverId("driver-no-location")
                    .name("No Location Driver")
                    .phone("0912-345-678")
                    .vehiclePlate("ABC-1234")
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].location").doesNotExist());
        }

        @Test
        @DisplayName("currentOrderId 為 null")
        void testBuildDriverSummary_NoCurrentOrderId() throws Exception {
            Driver driver = Driver.builder()
                    .driverId("driver-no-order")
                    .name("No Order Driver")
                    .phone("0912-345-678")
                    .vehiclePlate("ABC-1234")
                    .location(new Location(25.0, 30.0))
                    .status(DriverStatus.ONLINE)
                    .vehicleType(VehicleType.STANDARD)
                    .busy(false)
                    .lastUpdatedAt(Instant.now())
                    .build();

            when(driverService.getAllDrivers()).thenReturn(List.of(driver));

            mockMvc.perform(get("/api/admin/drivers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.drivers[0].currentOrderId").doesNotExist());
        }
    }
}
