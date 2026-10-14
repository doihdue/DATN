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
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { MyAppointmentsComponent } from './pages/my-appointments/my-appointments.component';
import { AppointmentManagementComponent } from './pages/appointment-management/appointment-management.component';
import { roleGuard, patientOrGuestGuard } from './guards/auth.guard';

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
    path: 'doctor/schedule',
    component: SchedulesComponent,
    title: 'Lịch trực Bác sĩ - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },

  // ========================
  // STAFF - Lễ tân tiếp đón (CHỈ STAFF, Admin không được dùng bàn này)
  // ========================
  {
    path: 'staff/check-in',
    component: CheckInComponent,
    title: 'Tiếp đón & Cấp số - MedQueue',
    canActivate: [roleGuard(['STAFF'])]
  },
  {
    path: 'staff/queue',
    component: QueueControlComponent,
    title: 'Bàn Điều phối Hàng đợi - MedQueue',
    canActivate: [roleGuard(['STAFF'])]
  },
  {
    path: 'staff/appointments',
    component: AppointmentManagementComponent,
    title: 'Quản lý lịch hẹn - MedQueue',
    canActivate: [roleGuard(['STAFF'])]
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
  // Đặt lịch khám online: khách xem được ca trống, đặt lịch cần đăng nhập bệnh nhân
  {
    path: 'booking',
    component: BookAppointmentComponent,
    title: 'Đặt lịch khám - MedQueue',
    canActivate: [patientOrGuestGuard]
  },
  {
    path: 'my-appointments',
    component: MyAppointmentsComponent,
    title: 'Lịch hẹn của tôi - MedQueue',
    canActivate: [roleGuard(['PATIENT'])]
  },
  {
    path: 'my-tickets',
    component: QueueTrackingComponent,
    title: 'Phiếu khám của tôi - MedQueue',
    canActivate: [roleGuard(['PATIENT'])]
  },

  { path: '**', redirectTo: '' }
];
