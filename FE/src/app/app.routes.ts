import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SpecialtiesComponent } from './pages/specialties/specialties.component';
import { SchedulesComponent } from './pages/schedules/schedules.component';
import { QueueControlComponent } from './pages/queue-control/queue-control.component';
import { QueueDisplayComponent } from './pages/queue-display/queue-display.component';
import { QueueTrackingComponent } from './pages/queue-tracking/queue-tracking.component';
import { DoctorExaminationComponent } from './pages/doctor-examination/doctor-examination.component';
import { MedicinesComponent } from './pages/medicines/medicines.component';
import { CheckInComponent } from './pages/check-in/check-in.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LabManagementComponent } from './pages/lab-management/lab-management.component';
import { LabServicesComponent } from './pages/lab-services/lab-services.component';
import { DoctorHistoryComponent } from './pages/doctor-history/doctor-history.component';
import { roleGuard, patientOrGuestGuard, receptionistGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Trang chủ - ai cũng vào được
  { path: '', component: HomeComponent, title: 'MedQueue - Trang chủ' },
  { path: 'login', component: LoginComponent, title: 'Đăng nhập - MedQueue' },
  { path: 'register', component: RegisterComponent, title: 'Đăng ký hồ sơ khám - MedQueue' },

  // ========================
  // ADMIN - Quản trị hệ thống
  // ========================
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Dashboard - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },
  { path: 'admin', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', redirectTo: 'dashboard' },
  {
    path: 'admin/specialties',
    component: SpecialtiesComponent,
    title: 'Quản lý Chuyên khoa - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/medicines',
    component: MedicinesComponent,
    title: 'Quản lý Dược phẩm & Thuốc - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/schedules',
    component: SchedulesComponent,
    title: 'Quản lý Lịch làm việc - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },

  // ========================
  // DOCTOR - Bác sĩ khám bệnh
  // ========================
  {
    path: 'doctor/examination',
    component: DoctorExaminationComponent,
    title: 'Bàn Khám Bệnh & Kê Đơn - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },
  {
    path: 'doctor/examination/:ticketId',
    component: DoctorExaminationComponent,
    title: 'Bàn Khám Bệnh & Kê Đơn - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },
  {
    path: 'doctor/calling',
    component: QueueControlComponent,
    title: 'Gọi khám bệnh - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },
  {
    path: 'doctor/history',
    component: DoctorHistoryComponent,
    title: 'Lịch Sử Ca Khám Bệnh - MedQueue',
    canActivate: [roleGuard(['DOCTOR', 'ADMIN'])]
  },
  {
    path: 'doctor/medicines',
    component: MedicinesComponent,
    title: 'Tra Cứu Danh Mục Thuốc - MedQueue',
    canActivate: [roleGuard(['DOCTOR', 'ADMIN'])]
  },
  {
    path: 'doctor/schedule',
    component: SchedulesComponent,
    title: 'Lịch trực Bác sĩ - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },

  // ========================
  // STAFF - Lễ tân tiếp đón (CHỈ LỄ TÂN, KTV Xét nghiệm vào /lab)
  // ========================
  {
    path: 'staff/check-in',
    component: CheckInComponent,
    title: 'Tiếp đón & Cấp số - MedQueue',
    canActivate: [receptionistGuard]
  },
  {
    path: 'staff/queue',
    component: QueueControlComponent,
    title: 'Bàn Điều phối Hàng đợi - MedQueue',
    canActivate: [receptionistGuard]
  },

  // ========================
  // LAB - Phòng Xét Nghiệm & Cận Lâm Sàng
  // ========================
  {
    path: 'lab',
    component: LabManagementComponent,
    title: 'Phòng Xét Nghiệm & Cận Lâm Sàng - MedQueue',
    canActivate: [roleGuard(['ADMIN', 'DOCTOR', 'STAFF', 'LAB_TECH'])]
  },
  {
    path: 'lab/services',
    component: LabServicesComponent,
    title: 'Danh Mục Xét Nghiệm & Chỉ Số Chuẩn - MedQueue',
    canActivate: [roleGuard(['ADMIN', 'DOCTOR', 'STAFF', 'LAB_TECH'])]
  },
  {
    path: 'lab/schedule',
    component: SchedulesComponent,
    title: 'Ca Trực & Phân Công KTV - MedQueue',
    canActivate: [roleGuard(['ADMIN', 'STAFF', 'LAB_TECH'])]
  },

  // ========================
  // PATIENT & Công khai
  // ========================
  // Bảng TV công khai - ai cũng xem được
  { path: 'queue', component: QueueDisplayComponent, title: 'Bảng gọi số TV Sảnh chờ - MedQueue' },

  // Tra cứu & Lấy số: Chỉ Patient hoặc Khách (nhân viên y tế bị redirect về bàn làm việc)
  {
    path: 'queue/tracking',
    component: QueueTrackingComponent,
    title: 'Tra cứu phiếu khám - MedQueue',
    canActivate: [patientOrGuestGuard]
  },
  {
    path: 'my-tickets',
    component: QueueTrackingComponent,
    title: 'Phiếu khám của tôi - MedQueue',
    canActivate: [roleGuard(['PATIENT'])]
  },

  { path: '**', redirectTo: '' }
];
