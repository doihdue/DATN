import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'MedQueue - Trang chủ' },
  { path: 'login', component: LoginComponent, title: 'Đăng nhập - MedQueue' },
  { path: 'register', component: RegisterComponent, title: 'Đăng ký hồ sơ khám - MedQueue' },
  { path: '**', redirectTo: '' }
];
