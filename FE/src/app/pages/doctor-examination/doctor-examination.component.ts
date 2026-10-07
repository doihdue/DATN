import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MedicalRecordService } from '../../services/medical-record.service';
import { MedicineCategoryService } from '../../services/medicine-category.service';
import { QueueService } from '../../services/queue.service';
import { AuthService } from '../../services/auth.service';
import {
  Medicine,
  PrescriptionItemRequest,
  CreateMedicalRecordRequest,
  MedicalRecordResponse,
  PatientMedicalHistoryResponse
} from '../../models/medical-record.model';
import { MedicineCategory } from '../../models/medicine-category.model';
import { QueueTicket } from '../../models/queue.model';

interface PrescribedItemUI extends PrescriptionItemRequest {
  _medicineName: string;
  _activeIngredient?: string;
  _unit: string;
  _price?: number;
  _categoryName?: string;
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
  private readonly categoryService = inject(MedicineCategoryService);
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
  categoriesList = signal<MedicineCategory[]>([]);
  selectedMedicineCategoryId = signal<number | null>(null);
  medicinesList = signal<Medicine[]>([]);
  filteredMedicines = signal<Medicine[]>([]);
  isSearchingMedicine = signal<boolean>(false);
  showMedicineDropdown = signal<boolean>(false);

  // In đơn thuốc & bệnh án
  completedRecord = signal<MedicalRecordResponse | null>(null);
  showPrintModal = signal<boolean>(false);

  // Quản lý trạng thái lỗi validation của các trường nhập liệu
  validationErrors: Record<string, boolean> = {};

  clearFieldError(fieldName: string): void {
    if (this.validationErrors[fieldName]) {
      this.validationErrors[fieldName] = false;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  focusAndScrollToField(elementId: string): void {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 80);
  }

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
    if (!this.authService.hasRole('DOCTOR')) {
      this.router.navigate(['/']);
      return;
    }

    // 0. Đọc ngay từ router state hoặc sessionStorage (nếu vừa chuyển từ màn điều phối)
    const stateTicket = history.state?.ticket;
    if (stateTicket) {
      this.currentTicket.set(stateTicket);
      if (stateTicket.id) this.ticketId.set(stateTicket.id);
      if (stateTicket.patientId) this.loadPatientHistory(stateTicket.patientId);
    } else {
      try {
        const saved = sessionStorage.getItem('currentExaminingTicket');
        if (saved) {
          const t = JSON.parse(saved);
          this.currentTicket.set(t);
          if (t.id) this.ticketId.set(t.id);
          if (t.patientId) this.loadPatientHistory(t.patientId);
        }
      } catch {}
    }

    // Đọc ticketId từ URL (nếu có) để gọi API lấy dữ liệu mới nhất
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('ticketId');
      if (idParam) {
        this.ticketId.set(+idParam);
        this.loadTicketInfo(+idParam);
      } else if (!this.currentTicket()) {
        this.loadActiveExaminingTicket();
      }
    });

    // Tải danh mục thuốc & nhóm thuốc sẵn sàng cho tra cứu
    this.loadCategories();
    this.loadMedicines();
  }

  ngOnDestroy(): void {}

  loadTicketInfo(id: number): void {
    this.loading.set(true);
    // 1. Gọi API lấy chính xác vé khám theo Ticket ID
    this.queueService.getTicketById(id).subscribe({
      next: res => {
        if (res.data) {
          const t: QueueTicket = res.data;
          this.currentTicket.set(t);
          if (t.patientId) {
            this.loadPatientHistory(t.patientId);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        // Fallback nếu gọi ID thất bại: lấy số vé đang khám từ display board
        this.fallbackToDisplayBoard();
      }
    });
  }

  loadActiveExaminingTicket(): void {
    this.loading.set(true);
    // Tra cứu danh sách ca khám hiện tại của phòng 1
    this.queueService.getRoomQueue(1).subscribe({
      next: res => {
        if (res.data) {
          const overview = res.data;
          const activeTicket = overview.currentExaminingTicket || overview.currentCalledTicket || (overview.waitingTickets && overview.waitingTickets[0]);
          if (activeTicket) {
            this.ticketId.set(activeTicket.id);
            this.currentTicket.set(activeTicket);
            if (activeTicket.patientId) {
              this.loadPatientHistory(activeTicket.patientId);
            }
            this.loading.set(false);
            return;
          }
        }
        this.fallbackToDisplayBoard();
      },
      error: () => this.fallbackToDisplayBoard()
    });
  }

  fallbackToDisplayBoard(): void {
    this.queueService.getDisplayBoard().subscribe({
      next: boardRes => {
        if (boardRes.data && boardRes.data.length > 0) {
          const room1 = boardRes.data.find(r => r.roomId === 1) || boardRes.data[0];
          const ticketNum = room1?.currentExaminingTicketNumber || room1?.currentCalledTicketNumber;
          if (ticketNum && ticketNum !== '--') {
            this.queueService.getMyTicketStatus(ticketNum).subscribe({
              next: statusRes => {
                if (statusRes.data) {
                  const s = statusRes.data;
                  this.currentTicket.set({
                    id: this.ticketId() || 1,
                    ticketNumber: s.ticketNumber,
                    ticketDate: s.ticketDate,
                    patientName: s.patientName,
                    patientPhone: '',
                    isEmergency: false,
                    hasAppointment: false,
                    priorityScore: s.priorityScore,
                    status: s.status as any,
                    checkInTime: s.checkInTime || '',
                    estimatedWaitingMinutes: s.estimatedWaitingMinutes,
                    examinationRoomId: s.roomId || 1,
                    roomNumber: s.roomNumber || '',
                    roomName: s.roomName || '',
                    doctorName: s.doctorName,
                    specialtyName: s.specialtyName
                  });
                }
                this.loading.set(false);
              },
              error: () => this.loading.set(false)
            });
            return;
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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

  loadCategories(): void {
    this.categoryService.getCategories(true).subscribe({
      next: res => {
        if (res.data) {
          this.categoriesList.set(res.data);
        }
      }
    });
  }

  // UC: Tìm kiếm & chọn thuốc
  loadMedicines(): void {
    this.medicalService.getMedicines().subscribe({
      next: res => {
        if (res.data) {
          this.medicinesList.set(res.data);
          this.filterMedicinesList();
        }
      }
    });
  }

  filterMedicinesList(): void {
    const kw = this.medicineSearchKeyword.trim().toLowerCase();
    const catId = this.selectedMedicineCategoryId();
    let list = this.medicinesList();

    if (catId) {
      list = list.filter(m => m.categoryId === catId);
    }

    if (kw) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        (m.code && m.code.toLowerCase().includes(kw)) ||
        (m.activeIngredient && m.activeIngredient.toLowerCase().includes(kw))
      );
    }

    this.filteredMedicines.set(list);
  }

  onSearchMedicineInput(): void {
    const kw = this.medicineSearchKeyword.trim();
    if (!kw && !this.selectedMedicineCategoryId()) {
      this.filteredMedicines.set(this.medicinesList().slice(0, 10));
      this.showMedicineDropdown.set(false);
      return;
    }
    this.showMedicineDropdown.set(true);
    this.filterMedicinesList();
  }

  selectCategoryFilter(catId: number | null): void {
    this.selectedMedicineCategoryId.set(catId);
    this.showMedicineDropdown.set(true);
    this.filterMedicinesList();
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
      _price: med.price,
      _categoryName: med.categoryName,
      _allergyWarning: hasAllergy,
      quantity: 10,
      dosage: med.defaultUsageInstructions || '1 viên/lần, 2 lần/ngày',
      route: med.routeOfAdministration || 'Đường uống',
      daysSupply: 5,
      instructions: med.defaultUsageInstructions || 'Uống sau bữa ăn'
    });

    this.medicineSearchKeyword = '';
    this.showMedicineDropdown.set(false);
    this.clearFieldError('prescribedItems');

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
    this.clearFieldError('finalDiagnosis');
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
    this.clearFieldError('revisitDate');
    if (!this.revisitNotes) {
      this.revisitNotes = `Tái khám sau ${days} ngày để đánh giá đáp ứng điều trị.`;
    }
  }

  // Gửi hồ sơ khám bệnh về BE
  saveExamination(): void {
    this.validationErrors = {};
    const missingFields: string[] = [];
    let firstInvalidElementId: string | null = null;

    // 1. Kiểm tra Triệu chứng lâm sàng
    if (!this.symptoms || !this.symptoms.trim()) {
      this.validationErrors['symptoms'] = true;
      missingFields.push('Triệu chứng lâm sàng');
      if (!firstInvalidElementId) firstInvalidElementId = 'symptomsField';
    }

    // 2. Kiểm tra Chẩn đoán xác định bệnh
    if (!this.finalDiagnosis || !this.finalDiagnosis.trim()) {
      this.validationErrors['finalDiagnosis'] = true;
      missingFields.push('Chẩn đoán xác định bệnh');
      if (!firstInvalidElementId) firstInvalidElementId = 'finalDiagnosisField';
    }

    // 3. Kiểm tra Ngày hẹn tái khám (nếu bật hẹn tái khám)
    if (this.hasRevisit && !this.revisitDate) {
      this.validationErrors['revisitDate'] = true;
      missingFields.push('Ngày hẹn tái khám');
      if (!firstInvalidElementId) firstInvalidElementId = 'revisitDateField';
    }

    // 4. Kiểm tra Đơn thuốc (nếu bật kê đơn thuốc điện tử)
    if (this.hasPrescription) {
      if (this.prescribedItems.length === 0) {
        this.validationErrors['prescribedItems'] = true;
        missingFields.push('Thuốc kê đơn');
        if (!firstInvalidElementId) firstInvalidElementId = 'medicineSearchInput';
      } else {
        for (let i = 0; i < this.prescribedItems.length; i++) {
          const item = this.prescribedItems[i];
          if (!item.quantity || item.quantity <= 0) {
            this.validationErrors[`item_qty_${i}`] = true;
            missingFields.push(`Số lượng (${item._medicineName})`);
            if (!firstInvalidElementId) firstInvalidElementId = `item_qty_${i}`;
          }
          if (!item.dosage || !item.dosage.trim()) {
            this.validationErrors[`item_dosage_${i}`] = true;
            missingFields.push(`Liều dùng (${item._medicineName})`);
            if (!firstInvalidElementId) firstInvalidElementId = `item_dosage_${i}`;
          }
        }
      }
    }

    // Nếu có bất kỳ lỗi nào, thông báo và dừng lại (tất cả các ô lỗi đều đã được bôi đỏ cùng lúc)
    if (missingFields.length > 0) {
      if (missingFields.length === 1) {
        this.showAlert(`Vui lòng hoàn thiện: ${missingFields[0]}!`, 'danger');
      } else {
        this.showAlert(`Có ${missingFields.length} thông tin bắt buộc chưa hợp lệ! Vui lòng điền các ô được bôi đỏ.`, 'danger');
      }
      if (firstInvalidElementId) {
        this.focusAndScrollToField(firstInvalidElementId);
      }
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
