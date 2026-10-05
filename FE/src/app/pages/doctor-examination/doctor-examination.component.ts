import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MedicalRecordService } from '../../services/medical-record.service';
import { QueueService } from '../../services/queue.service';
import { AuthService } from '../../services/auth.service';
import {
  Medicine,
  PrescriptionItemRequest,
  CreateMedicalRecordRequest,
  MedicalRecordResponse,
  PatientMedicalHistoryResponse
} from '../../models/medical-record.model';
import { QueueTicket } from '../../models/queue.model';

interface PrescribedItemUI extends PrescriptionItemRequest {
  _medicineName: string;
  _activeIngredient?: string;
  _unit: string;
  _allergyWarning?: boolean;
}

@Component({
  selector: 'app-doctor-examination',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-examination.component.html',
  styleUrls: ['./doctor-examination.component.scss']
})
export class DoctorExaminationComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medicalService = inject(MedicalRecordService);
  private readonly queueService = inject(QueueService);
  readonly authService = inject(AuthService);

  // Trạng thái phiếu khám & bệnh nhân
  ticketId = signal<number | null>(null);
  currentTicket = signal<QueueTicket | null>(null);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'danger'>('success');

  // UC: Xem tiền sử bệnh
  patientHistory = signal<PatientMedicalHistoryResponse | null>(null);
  loadingHistory = signal<boolean>(false);
  selectedHistoryRecord = signal<MedicalRecordResponse | null>(null);
  showHistoryDrawer = signal<boolean>(false);

  // Chỉ số sinh tồn (Vital Signs)
  bloodPressure = '';
  heartRate: number | null = null;
  temperature: number | null = null;
  weight: number | null = null;
  height: number | null = null;
  vitalSignsNotes = '';

  // Tính BMI tự động
  bmi = computed(() => {
    const w = this.weight;
    const h = this.height;
    if (w && h && h > 0) {
      const hMeters = h / 100;
      const val = +(w / (hMeters * hMeters)).toFixed(1);
      let classification = 'Bình thường';
      let badgeClass = 'bmi-normal';
      if (val < 18.5) {
        classification = 'Gầy / Nhẹ cân';
        badgeClass = 'bmi-warning';
      } else if (val >= 23 && val < 25) {
        classification = 'Thừa cân tiền béo phì';
        badgeClass = 'bmi-warning';
      } else if (val >= 25) {
        classification = 'Béo phì';
        badgeClass = 'bmi-danger';
      }
      return { val, classification, badgeClass };
    }
    return null;
  });

  // UC: Lập hồ sơ bệnh án
  symptoms = '';
  preliminaryDiagnosis = '';
  finalDiagnosis = '';
  icd10Code = '';
  notes = '';

  // UC: Hẹn ngày tái khám (Extend)
  hasRevisit = false;
  revisitDate = '';
  revisitNotes = '';

  // UC: Kê đơn thuốc (Extend)
  hasPrescription = true;
  prescriptionAdvice = 'Uống thuốc đúng theo hướng dẫn, uống đủ liều và tái khám đúng hẹn.';
  prescribedItems: PrescribedItemUI[] = [];

  // UC: Tìm kiếm & chọn thuốc (Include in Kê đơn)
  medicineSearchKeyword = '';
  medicinesList = signal<Medicine[]>([]);
  filteredMedicines = signal<Medicine[]>([]);
  isSearchingMedicine = signal<boolean>(false);
  showMedicineDropdown = signal<boolean>(false);

  // In đơn thuốc & bệnh án
  completedRecord = signal<MedicalRecordResponse | null>(null);
  showPrintModal = signal<boolean>(false);

  // Chẩn đoán nhanh mẫu
  readonly commonDiagnoses = [
    { title: 'Viêm họng cấp', icd: 'J02.9', notes: 'Súc họng nước muối, giữ ấm cổ' },
    { title: 'Cảm cúm thông thường', icd: 'J11.1', notes: 'Uống nhiều nước ấm, nghỉ ngơi' },
    { title: 'Viêm phế quản cấp', icd: 'J20.9', notes: 'Tránh khói bụi, thuốc lá, uống đủ nước' },
    { title: 'Viêm dạ dày - tá tràng', icd: 'K29.7', notes: 'Ăn đúng giờ, kiêng đồ chua cay, cà phê, rượu bia' },
    { title: 'Tăng huyết áp vô căn', icd: 'I10', notes: 'Ăn nhạt, hạn chế muối mỡ, đo huyết áp hàng ngày' },
    { title: 'Viêm mũi xoang dị ứng', icd: 'J30.4', notes: 'Đeo khẩu trang, tránh tiếp xúc dị nguyên' }
  ];

  ngOnInit(): void {
    // Đọc ticketId từ URL (nếu có)
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('ticketId');
      if (idParam) {
        this.ticketId.set(+idParam);
        this.loadTicketInfo(+idParam);
      }
    });

    // Tải danh mục thuốc sẵn sàng cho tra cứu
    this.loadMedicines();
  }

  ngOnDestroy(): void {}

  loadTicketInfo(id: number): void {
    this.loading.set(true);
    // Tra cứu vé từ API tra cứu phiếu
    this.queueService.getMyTicketStatus(id.toString()).subscribe({
      next: res => {
        if (res.data) {
          const t: any = res.data;
          this.currentTicket.set(t);
          if (t.patientId) {
            this.loadPatientHistory(t.patientId);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        // Fallback: nếu gọi theo số phiếu thất bại, thử lấy theo overview phòng
        this.loading.set(false);
      }
    });
  }

  // UC: Xem tiền sử bệnh
  loadPatientHistory(patientId: number): void {
    this.loadingHistory.set(true);
    this.medicalService.getPatientMedicalHistory(patientId).subscribe({
      next: res => {
        if (res.data) {
          this.patientHistory.set(res.data);
        }
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  viewHistoryRecordDetail(record: MedicalRecordResponse): void {
    this.selectedHistoryRecord.set(record);
  }

  closeHistoryRecordDetail(): void {
    this.selectedHistoryRecord.set(null);
  }

  // UC: Tìm kiếm & chọn thuốc
  loadMedicines(): void {
    this.medicalService.getMedicines().subscribe({
      next: res => {
        if (res.data) {
          this.medicinesList.set(res.data);
          this.filteredMedicines.set(res.data.slice(0, 10));
        }
      }
    });
  }

  onSearchMedicineInput(): void {
    const kw = this.medicineSearchKeyword.trim().toLowerCase();
    if (!kw) {
      this.filteredMedicines.set(this.medicinesList().slice(0, 10));
      this.showMedicineDropdown.set(false);
      return;
    }

    this.showMedicineDropdown.set(true);
    const matches = this.medicinesList().filter(m =>
      m.name.toLowerCase().includes(kw) ||
      (m.activeIngredient && m.activeIngredient.toLowerCase().includes(kw))
    );
    this.filteredMedicines.set(matches);
  }

  selectMedicine(med: Medicine): void {
    // Kiểm tra cảnh báo dị ứng nếu có
    let hasAllergy = false;
    const history = this.patientHistory();
    if (history && history.allergies) {
      const allergyLower = history.allergies.toLowerCase();
      if (
        allergyLower.includes(med.name.toLowerCase()) ||
        (med.activeIngredient && allergyLower.includes(med.activeIngredient.toLowerCase()))
      ) {
        hasAllergy = true;
      }
    }

    // Thêm vào bảng đơn thuốc
    this.prescribedItems.push({
      medicineId: med.id,
      _medicineName: med.name,
      _activeIngredient: med.activeIngredient,
      _unit: med.unit || 'Viên',
      _allergyWarning: hasAllergy,
      quantity: 10,
      dosage: med.defaultUsageInstructions || '1 viên/lần, 2 lần/ngày',
      route: 'Đường uống',
      daysSupply: 5,
      instructions: med.defaultUsageInstructions || 'Uống sau bữa ăn'
    });

    this.medicineSearchKeyword = '';
    this.showMedicineDropdown.set(false);

    if (hasAllergy) {
      this.showAlert(`⚠️ CẢNH BÁO: Bệnh nhân có tiền sử dị ứng liên quan tới thuốc "${med.name}"!`, 'danger');
    }
  }

  removeMedicine(index: number): void {
    this.prescribedItems.splice(index, 1);
  }

  // Gợi ý chẩn đoán nhanh
  applyQuickDiagnosis(diag: { title: string; icd: string; notes: string }): void {
    this.finalDiagnosis = diag.title;
    this.icd10Code = diag.icd;
    if (!this.notes) {
      this.notes = diag.notes;
    }
  }

  // UC: Hẹn ngày tái khám nhanh
  setQuickRevisit(days: number): void {
    const d = new Date();
    d.setDate(d.getDate() + days);
    this.revisitDate = d.toISOString().split('T')[0];
    this.hasRevisit = true;
    if (!this.revisitNotes) {
      this.revisitNotes = `Tái khám sau ${days} ngày để đánh giá đáp ứng điều trị.`;
    }
  }

  // Gửi hồ sơ khám bệnh về BE
  saveExamination(): void {
    if (!this.symptoms.trim()) {
      this.showAlert('Vui lòng nhập triệu chứng lâm sàng của bệnh nhân!', 'danger');
      return;
    }
    if (!this.finalDiagnosis.trim()) {
      this.showAlert('Vui lòng nhập chẩn đoán xác định bệnh!', 'danger');
      return;
    }

    const patientId = this.currentTicket()?.patientId || this.patientHistory()?.patientId || 1;

    // Chuẩn bị payload
    const req: CreateMedicalRecordRequest = {
      queueTicketId: this.ticketId() || undefined,
      patientId: patientId,
      bloodPressure: this.bloodPressure ? this.bloodPressure.trim() : undefined,
      heartRate: this.heartRate || undefined,
      temperature: this.temperature || undefined,
      weight: this.weight || undefined,
      height: this.height || undefined,
      vitalSigns: this.vitalSignsNotes ? this.vitalSignsNotes.trim() : undefined,
      symptoms: this.symptoms.trim(),
      preliminaryDiagnosis: this.preliminaryDiagnosis ? this.preliminaryDiagnosis.trim() : undefined,
      finalDiagnosis: this.finalDiagnosis.trim(),
      icd10Code: this.icd10Code ? this.icd10Code.trim() : undefined,
      notes: this.notes ? this.notes.trim() : undefined,
      revisitDate: this.hasRevisit && this.revisitDate ? this.revisitDate : undefined,
      revisitNotes: this.hasRevisit ? this.revisitNotes : undefined,
      prescriptionAdvice: this.hasPrescription ? this.prescriptionAdvice : undefined,
      prescriptionItems: this.hasPrescription && this.prescribedItems.length > 0
        ? this.prescribedItems.map(item => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            dosage: item.dosage,
            route: item.route,
            daysSupply: item.daysSupply,
            instructions: item.instructions
          }))
        : undefined
    };

    this.submitting.set(true);
    this.medicalService.createMedicalRecord(req).subscribe({
      next: res => {
        this.submitting.set(false);
        this.completedRecord.set(res.data || null);
        this.showAlert('Đã lưu hồ sơ bệnh án thành công và hoàn tất ca khám!', 'success');
        // Mở cửa sổ in ấn đơn thuốc / kết quả khám
        this.showPrintModal.set(true);
      },
      error: err => {
        this.submitting.set(false);
        this.showAlert(err.error?.message || 'Có lỗi xảy ra khi lưu hồ sơ khám!', 'danger');
      }
    });
  }

  printDocument(): void {
    window.print();
  }

  finishAndReturnToQueue(): void {
    this.showPrintModal.set(false);
    this.router.navigate(['/doctor/calling']);
  }

  showAlert(msg: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 6000);
  }
}
