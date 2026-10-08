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
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { MyAppointmentsComponent } from './pages/my-appointments/my-appointments.component';
import { AppointmentManagementComponent } from './pages/appointment-management/appointment-management.component';
import { roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'MedQueue - Trang chủ' },
  { path: 'login', component: LoginComponent, title: 'Đăng nhập - MedQueue' },
  { path: 'register', component: RegisterComponent, title: 'Đăng ký hồ sơ khám - MedQueue' },

  // 1. Quản lý Chuyên khoa (Specialty Management) - Dành riêng cho ADMIN
  {
    path: 'admin/specialties',
    component: SpecialtiesComponent,
    title: 'Quản lý Chuyên khoa - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },

  // 1b. Quản lý Danh mục Thuốc & Dược phẩm - Dành riêng cho ADMIN
  {
    path: 'admin/medicines',
    component: MedicinesComponent,
    title: 'Quản lý Dược phẩm & Thuốc - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },

  // 2. Quản lý Lịch làm việc (Work Schedule Management)
  // ADMIN quản lý toàn bộ lịch làm việc
  {
    path: 'admin/schedules',
    component: SchedulesComponent,
    title: 'Quản lý Lịch làm việc - MedQueue',
    canActivate: [roleGuard(['ADMIN'])]
  },
  // BÁC SĨ xem lịch trực của mình
  {
    path: 'doctor/schedule',
    component: SchedulesComponent,
    title: 'Lịch trực Bác sĩ - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },

  // Đặt lịch khám online: ai cũng xem được ca trống, đặt lịch cần đăng nhập bệnh nhân
  { path: 'booking', component: BookAppointmentComponent, title: 'Đặt lịch khám - MedQueue' },
  {
    path: 'my-appointments',
    component: MyAppointmentsComponent,
    title: 'Lịch hẹn của tôi - MedQueue',
    canActivate: [roleGuard(['PATIENT'])]
  },
  // Lễ tân xác nhận / check-in lịch hẹn online
  {
    path: 'staff/appointments',
    component: AppointmentManagementComponent,
    title: 'Quản lý lịch hẹn - MedQueue',
    canActivate: [roleGuard(['STAFF', 'ADMIN'])]
  },

  // 3a. Tiếp Đón & Cấp Số Thứ Tự (Patient Reception & Check-in)
  {
    path: 'staff/check-in',
    component: CheckInComponent,
    title: 'Tiếp đón & Cấp số - MedQueue',
    canActivate: [roleGuard(['STAFF', 'ADMIN'])]
  },

  // 3b. Điều phối Hàng đợi số (Queue Coordination & Load Balancing)
  {
    path: 'staff/queue',
    component: QueueControlComponent,
    title: 'Bàn Điều phối Hàng đợi - MedQueue',
    canActivate: [roleGuard(['STAFF', 'ADMIN'])]
  },
  // BÁC SĨ gọi khám tại phòng khám
  {
    path: 'doctor/calling',
    component: QueueControlComponent,
    title: 'Gọi khám bệnh - MedQueue',
    canActivate: [roleGuard(['DOCTOR'])]
  },

  // Bảng TV và Tra cứu (Dành cho Bệnh nhân & Đại chúng)
  { path: 'queue', component: QueueDisplayComponent, title: 'Bảng gọi số TV Sảnh chờ - MedQueue' },
  { path: 'queue/tracking', component: QueueTrackingComponent, title: 'Tra cứu phiếu khám - MedQueue' },
  { path: 'my-tickets', component: QueueTrackingComponent, title: 'Phiếu khám của tôi - MedQueue' },

  // 4. Bàn Khám Bệnh & Kê Đơn Thuốc (Doctor Medical Examination & Prescription) - DÀNH RIÊNG CHO BÁC SĨ
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

  { path: '**', redirectTo: '' }
];
