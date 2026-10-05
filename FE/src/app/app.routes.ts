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

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'MedQueue - Trang chủ' },
  { path: 'login', component: LoginComponent, title: 'Đăng nhập - MedQueue' },
  { path: 'register', component: RegisterComponent, title: 'Đăng ký hồ sơ khám - MedQueue' },

  // 1. Quản lý Chuyên khoa (Specialty Management)
  { path: 'admin/specialties', component: SpecialtiesComponent, title: 'Quản lý Chuyên khoa - MedQueue' },

  // 2. Quản lý Lịch làm việc (Work Schedule Management)
  { path: 'admin/schedules', component: SchedulesComponent, title: 'Quản lý Lịch làm việc - MedQueue' },
  { path: 'doctor/schedule', component: SchedulesComponent, title: 'Lịch trực Bác sĩ - MedQueue' },

  // 3. Điều phối Hàng đợi số (Queue Coordination)
  { path: 'staff/queue', component: QueueControlComponent, title: 'Bàn Điều phối Tiếp đón - MedQueue' },
  { path: 'staff/check-in', component: QueueControlComponent, title: 'Tiếp đón & Cấp số - MedQueue' },
  { path: 'doctor/calling', component: QueueControlComponent, title: 'Gọi khám bệnh - MedQueue' },
  { path: 'queue', component: QueueDisplayComponent, title: 'Bảng gọi số TV Sảnh chờ - MedQueue' },
  { path: 'queue/tracking', component: QueueTrackingComponent, title: 'Tra cứu phiếu khám - MedQueue' },
  { path: 'my-tickets', component: QueueTrackingComponent, title: 'Phiếu khám của tôi - MedQueue' },

  // 4. Bàn Khám Bệnh & Kê Đơn Thuốc (Doctor Medical Examination & Prescription)
  { path: 'doctor/examination', component: DoctorExaminationComponent, title: 'Bàn Khám Bệnh & Kê Đơn - MedQueue' },
  { path: 'doctor/examination/:ticketId', component: DoctorExaminationComponent, title: 'Bàn Khám Bệnh & Kê Đơn - MedQueue' },

  { path: '**', redirectTo: '' }
];
