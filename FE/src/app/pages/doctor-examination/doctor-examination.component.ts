import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MedicalRecordService } from '../../services/medical-record.service';
import { MedicineCategoryService } from '../../services/medicine-category.service';
import { QueueService } from '../../services/queue.service';
import { AuthService } from '../../services/auth.service';
import { ClinicalLabService } from '../../services/lab.service';
import { ScheduleService } from '../../services/schedule.service';
import { ExaminationRoom } from '../../models/schedule.model';
import {
  Medicine,
  PrescriptionItemRequest,
  CreateMedicalRecordRequest,
  MedicalRecordResponse,
  PatientMedicalHistoryResponse
} from '../../models/medical-record.model';
import { MedicineCategory } from '../../models/medicine-category.model';
import { QueueTicket, RoomQueueOverview } from '../../models/queue.model';
import { toIsoDate } from '../../utils/date.utils';
import { LabService, LabOrder, SendLabOrdersRequest } from '../../models/lab.model';

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
  private readonly labService = inject(ClinicalLabService);
  private readonly scheduleService = inject(ScheduleService);
  readonly authService = inject(AuthService);

  // Trạng thái phiếu khám & bệnh nhân
  ticketId = signal<number | null>(null);
  currentTicket = signal<QueueTicket | null>(null);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'danger'>('success');

  // Hàng đợi phòng khám & Đổi bệnh nhân
  activeRoomId = signal<number>(1);
  roomTickets = signal<QueueTicket[]>([]);
  // Bệnh nhân bác sĩ đang phụ trách (đã gọi vào phòng / đang khám / đang làm hoặc đã có KQ xét nghiệm): đổi qua lại được
  readonly myPatients = computed(() => this.roomTickets().filter(t => t.status !== 'WAITING'));
  // Bệnh nhân còn chờ ngoài sảnh: chỉ hiển thị, muốn khám phải gọi số đúng thứ tự ở màn Gọi khám bệnh
  readonly waitingPatients = computed(() => this.roomTickets().filter(t => t.status === 'WAITING'));
  showQueueDrawer = signal<boolean>(false);

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
  downloadingPdf = signal<boolean>(false);

  // UC: Cận lâm sàng & Xét nghiệm (Lab Orders)
  existingRecordId = signal<number | null>(null);
  availableLabServices = signal<LabService[]>([]);
  filteredLabServices = signal<LabService[]>([]);
  selectedLabServices = signal<LabService[]>([]);
  labSearchKeyword = '';
  selectedLabCategory = signal<string>('ALL');
  submittingLab = signal<boolean>(false);
  labOrders = signal<LabOrder[]>([]);
  showLabPrintModal = signal<boolean>(false);
  lastSentLabRecord = signal<MedicalRecordResponse | null>(null);
  // Thời điểm gửi chỉ định, in trên phiếu
  labSentAt = signal<Date | null>(null);
  // Phòng cận lâm sàng (P.104 xét nghiệm, P.204 / P.205 CĐHA) để ghi nơi thực hiện trên phiếu
  labRooms = signal<ExaminationRoom[]>([]);

  labCategories = computed(() => {
    const list = this.availableLabServices().map(s => s.category).filter((c): c is string => !!c);
    const unique = Array.from(new Set(list));
    return ['ALL', ...unique];
  });

  totalLabFee = computed(() => this.selectedLabServices().reduce((sum, s) => sum + s.price, 0));
  hasAbnormalLabResults = computed(() => this.labOrders().some(o => o.isAbnormal));

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

    // 0. Đọc từ router state (nếu vừa chuyển từ màn điều phối/gọi số) để hiển thị ngay;
    // tiền sử bệnh sẽ được tải 1 lần khi đồng bộ vé ở bước dưới
    const stateTicket = history.state?.ticket;
    if (stateTicket && stateTicket.status !== 'COMPLETED') {
      this.currentTicket.set(stateTicket);
      if (stateTicket.id) this.ticketId.set(stateTicket.id);
      if (stateTicket.examinationRoomId) this.activeRoomId.set(stateTicket.examinationRoomId);
    } else {
      try {
        const saved = sessionStorage.getItem('currentExaminingTicket');
        if (saved) {
          const t = JSON.parse(saved);
          if (t && t.status !== 'COMPLETED') {
            this.currentTicket.set(t);
            if (t.id) this.ticketId.set(t.id);
            if (t.examinationRoomId) this.activeRoomId.set(t.examinationRoomId);
          } else {
            sessionStorage.removeItem('currentExaminingTicket');
          }
        }
      } catch {}
    }

    // Đọc ticketId từ URL (nếu có) để gọi API lấy dữ liệu mới nhất
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('ticketId');
      if (idParam) {
        this.ticketId.set(+idParam);
        this.loadTicketInfo(+idParam);
      } else {
        // Luôn đồng bộ dữ liệu thời gian thực từ phòng khám hiện tại
        this.loadActiveExaminingTicket();
      }
    });

    // Tải danh mục thuốc & nhóm thuốc & danh mục dịch vụ cận lâm sàng
    this.loadCategories();
    this.loadMedicines();
    this.loadLabServices();
  }

  ngOnDestroy(): void {}

  loadTicketInfo(id: number): void {
    this.loading.set(true);
    this.queueService.getTicketById(id).subscribe({
      next: res => {
        if (res.data) {
          const t: QueueTicket = res.data;
          this.currentTicket.set(t);
          if (t.examinationRoomId) this.activeRoomId.set(t.examinationRoomId);
          if (t.patientId) {
            this.loadPatientHistory(t.patientId);
          } else {
            this.patientHistory.set(null);
          }
          this.loadExistingRecord(t.id);
          this.loadRoomTickets();
        } else {
          this.currentTicket.set(null);
          this.ticketId.set(null);
          this.patientHistory.set(null);
          this.existingRecordId.set(null);
          this.labOrders.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.currentTicket.set(null);
        this.ticketId.set(null);
        this.patientHistory.set(null);
        this.loading.set(false);
      }
    });
  }

  // Danh sách bệnh nhân trong ngăn "Đổi bệnh nhân": luôn là hàng đợi phòng bác sĩ đang trực
  loadRoomTickets(): void {
    this.queueService.getMyRoomQueue().subscribe({
      next: res => {
        if (res.data) {
          const overview = res.data;
          this.roomTickets.set(this.buildRoomTickets(overview));
        }
      }
    });
  }

  // Gồm cả bệnh nhân đã gửi chỉ định (đang làm XN / đã có KQ) để bác sĩ mở lại xem kết quả
  private buildRoomTickets(overview: RoomQueueOverview): QueueTicket[] {
    return [
      ...(overview.currentExaminingTicket ? [overview.currentExaminingTicket] : []),
      ...(overview.currentCalledTicket ? [overview.currentCalledTicket] : []),
      ...(overview.resultsReadyTickets ?? []),
      ...(overview.waitingForResultsTickets ?? []),
      ...(overview.waitingTickets ?? [])
    ];
  }

  ticketStateLabel(status: string): string {
    switch (status) {
      case 'IN_PROGRESS': return 'Đang khám';
      case 'CALLED': return 'Đang gọi';
      case 'RESULTS_READY': return 'Có KQ CLS';
      case 'WAITING_FOR_RESULTS': return 'Đang làm XN';
      default: return 'Đang chờ';
    }
  }

  ticketStateClass(status: string): string {
    switch (status) {
      case 'IN_PROGRESS': return 'state-examining';
      case 'CALLED': return 'state-called';
      case 'RESULTS_READY': return 'state-results';
      case 'WAITING_FOR_RESULTS': return 'state-lab';
      default: return 'state-waiting';
    }
  }

  selectTicketToExamine(ticket: QueueTicket): void {
    if (ticket.status === 'WAITING') {
      this.showAlert(`Bệnh nhân #${ticket.ticketNumber} chưa được gọi. Hãy gọi số ở màn Gọi khám bệnh để giữ đúng thứ tự hàng đợi.`, 'danger');
      return;
    }
    this.currentTicket.set(ticket);
    this.ticketId.set(ticket.id);
    try {
      sessionStorage.setItem('currentExaminingTicket', JSON.stringify(ticket));
    } catch {}
    if (ticket.patientId) {
      this.loadPatientHistory(ticket.patientId);
    } else {
      this.patientHistory.set(null);
    }
    this.loadExistingRecord(ticket.id);
    this.showQueueDrawer.set(false);
    this.showAlert(`Đã chuyển sang khám bệnh nhân: ${ticket.patientName} (#${ticket.ticketNumber})`, 'success');
  }

  loadActiveExaminingTicket(): void {
    this.loading.set(true);
    // Luôn lấy theo phòng bác sĩ có ca trực hôm nay (không mặc định phòng đầu tiên)
    this.queueService.getMyRoomQueue().subscribe({
      next: res => {
        if (res.data) {
          const overview = res.data;
          this.activeRoomId.set(overview.examinationRoomId);
          this.roomTickets.set(this.buildRoomTickets(overview));

          // Chỉ nhận bệnh nhân đang được gọi hoặc đang trong ca khám tại phòng
          const activeTicket = overview.currentExaminingTicket || overview.currentCalledTicket;
          if (activeTicket) {
            this.ticketId.set(activeTicket.id);
            this.currentTicket.set(activeTicket);
            try {
              sessionStorage.setItem('currentExaminingTicket', JSON.stringify(activeTicket));
            } catch {}
            if (activeTicket.patientId) {
              this.loadPatientHistory(activeTicket.patientId);
            } else {
              this.patientHistory.set(null);
            }
            this.loadExistingRecord(activeTicket.id);
            this.loading.set(false);
            return;
          }
        }
        // Phòng khám chưa có bệnh nhân nào được gọi vào
        this.ticketId.set(null);
        this.currentTicket.set(null);
        this.patientHistory.set(null);
        this.loading.set(false);
      },
      error: () => {
        this.ticketId.set(null);
        this.currentTicket.set(null);
        this.patientHistory.set(null);
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
    this.revisitDate = toIsoDate(d);
    this.hasRevisit = true;
    this.clearFieldError('revisitDate');
    if (!this.revisitNotes) {
      this.revisitNotes = `Tái khám sau ${days} ngày để đánh giá đáp ứng điều trị.`;
    }
  }

  // Gửi hồ sơ khám bệnh về BE
  saveExamination(): void {
    // 0. Bắt buộc phải có bệnh nhân trong ca khám
    const currentTkt = this.currentTicket();
    if (!currentTkt || !currentTkt.id) {
      this.showAlert('Không thể lưu hồ sơ! Hiện tại phòng khám chưa có bệnh nhân nào. Vui lòng gọi số bệnh nhân hoặc chọn bệnh nhân từ hàng đợi trước khi hoàn tất ca khám.', 'danger');
      return;
    }

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

    const ticketId = currentTkt.id;
    const patientId = currentTkt.patientId || this.patientHistory()?.patientId || undefined;

    // Chuẩn bị payload
    const req: CreateMedicalRecordRequest = {
      recordId: this.existingRecordId() || undefined,
      queueTicketId: ticketId,
      patientId: patientId as any,
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
        try {
          sessionStorage.removeItem('currentExaminingTicket');
        } catch {}
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

  // Xuất file PDF bằng JasperReports
  downloadPdf(recordId?: number): void {
    const id = recordId || this.completedRecord()?.id;
    if (!id) {
      this.showAlert('Không tìm thấy mã hồ sơ bệnh án để xuất PDF!', 'danger');
      return;
    }

    this.downloadingPdf.set(true);
    this.medicalService.exportMedicalRecordPdf(id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `phieu-kham-don-thuoc-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
        this.showAlert('Đã tải xuống file PDF phiếu khám & đơn thuốc thành công!', 'success');
      },
      error: async err => {
        this.downloadingPdf.set(false);
        console.error('Lỗi xuất PDF JasperReports:', err);
        let errorMsg = 'Có lỗi khi tải file PDF từ máy chủ!';
        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            console.error('Backend error text:', text);
            const json = JSON.parse(text);
            if (json.message) errorMsg = json.message;
          } catch (e) {
            // ignore
          }
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }
        this.showAlert(errorMsg, 'danger');
      }
    });
  }

  previewPdfInNewTab(recordId?: number): void {
    const id = recordId || this.completedRecord()?.id;
    if (!id) {
      this.showAlert('Không tìm thấy mã hồ sơ bệnh án để mở xem PDF!', 'danger');
      return;
    }

    this.downloadingPdf.set(true);
    this.medicalService.exportMedicalRecordPdf(id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        const fileUrl = window.URL.createObjectURL(blob);
        window.open(fileUrl, '_blank');
      },
      error: async err => {
        this.downloadingPdf.set(false);
        console.error('Lỗi mở PDF JasperReports:', err);
        let errorMsg = 'Có lỗi khi mở xem file PDF!';
        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            console.error('Backend error text:', text);
            const json = JSON.parse(text);
            if (json.message) errorMsg = json.message;
          } catch (e) {
            // ignore
          }
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }
        this.showAlert(errorMsg, 'danger');
      }
    });
  }

  finishAndReturnToQueue(): void {
    this.showPrintModal.set(false);
    this.completedRecord.set(null);
    try {
      sessionStorage.removeItem('currentExaminingTicket');
    } catch {}
    // Xóa trắng form để chuẩn bị cho ca khám tiếp theo
    this.symptoms = '';
    this.preliminaryDiagnosis = '';
    this.finalDiagnosis = '';
    this.icd10Code = '';
    this.notes = '';
    this.bloodPressure = '';
    this.heartRate = null;
    this.temperature = null;
    this.weight = null;
    this.height = null;
    this.vitalSignsNotes = '';
    this.hasRevisit = false;
    this.revisitDate = '';
    this.revisitNotes = '';
    this.prescribedItems = [];
    this.selectedLabServices.set([]);
    this.labOrders.set([]);
    this.existingRecordId.set(null);
    this.router.navigate(['/doctor/calling']);
  }

  // --- Cận lâm sàng & Xét nghiệm Methods ---
  loadLabServices(): void {
    this.labService.getLabServices().subscribe({
      next: res => {
        if (res.data) {
          this.availableLabServices.set(res.data);
          this.filterLabServices();
        }
      }
    });
    this.scheduleService.getLabRooms().subscribe({
      next: res => this.labRooms.set(res.data || [])
    });
  }

  filterLabServices(): void {
    const kw = this.labSearchKeyword.trim().toLowerCase();
    const cat = this.selectedLabCategory();
    const list = this.availableLabServices().filter(s => {
      const matchKw = !kw || s.serviceName.toLowerCase().includes(kw) || s.serviceCode.toLowerCase().includes(kw);
      const matchCat = cat === 'ALL' || s.category === cat;
      return matchKw && matchCat;
    });
    this.filteredLabServices.set(list);
  }

  onLabCategoryChange(cat: string): void {
    this.selectedLabCategory.set(cat);
    this.filterLabServices();
  }

  toggleLabSelection(service: LabService): void {
    const current = this.selectedLabServices();
    const exists = current.some(s => s.id === service.id);
    if (exists) {
      this.selectedLabServices.set(current.filter(s => s.id !== service.id));
    } else {
      this.selectedLabServices.set([...current, service]);
    }
  }

  isLabSelected(id: number): boolean {
    return this.selectedLabServices().some(s => s.id === id);
  }

  removeSelectedLab(serviceId: number): void {
    this.selectedLabServices.set(this.selectedLabServices().filter(s => s.id !== serviceId));
  }

  // Pha 1: Bác sĩ gửi chỉ định cận lâm sàng & tạm dừng ca khám
  sendLabOrders(): void {
    const currentTkt = this.currentTicket();
    if (!currentTkt) {
      this.showAlert('Không tìm thấy thông tin lượt khám của bệnh nhân!', 'danger');
      return;
    }

    if (this.selectedLabServices().length === 0) {
      this.showAlert('Vui lòng chọn ít nhất 1 dịch vụ xét nghiệm từ danh mục cận lâm sàng!', 'danger');
      return;
    }

    if (!this.symptoms.trim()) {
      this.validationErrors['symptoms'] = true;
      this.showAlert('Vui lòng nhập triệu chứng lâm sàng sơ bộ trước khi gửi chỉ định xét nghiệm!', 'danger');
      this.focusAndScrollToField('symptomsField');
      return;
    }

    const req: SendLabOrdersRequest = {
      queueTicketId: currentTkt.id,
      patientId: currentTkt.patientId || this.patientHistory()?.patientId,
      bloodPressure: this.bloodPressure ? this.bloodPressure.trim() : undefined,
      heartRate: this.heartRate || undefined,
      temperature: this.temperature || undefined,
      weight: this.weight || undefined,
      height: this.height || undefined,
      vitalSigns: this.vitalSignsNotes ? this.vitalSignsNotes.trim() : undefined,
      symptoms: this.symptoms.trim(),
      preliminaryDiagnosis: this.preliminaryDiagnosis ? this.preliminaryDiagnosis.trim() : undefined,
      notes: this.notes ? this.notes.trim() : undefined,
      labServiceIds: this.selectedLabServices().map(s => s.id)
    };

    this.submittingLab.set(true);
    this.labService.sendLabOrders(req).subscribe({
      next: res => {
        this.submittingLab.set(false);
        this.lastSentLabRecord.set(res.data || null);
        this.labSentAt.set(new Date());
        try {
          sessionStorage.removeItem('currentExaminingTicket');
        } catch {}
        this.showLabPrintModal.set(true);
        this.showAlert('Đã gửi chỉ định cận lâm sàng thành công! Bệnh nhân đã chuyển sang chờ kết quả.', 'success');
      },
      error: err => {
        this.submittingLab.set(false);
        this.showAlert(err.error?.message || 'Có lỗi xảy ra khi gửi chỉ định xét nghiệm!', 'danger');
      }
    });
  }

  // Pha 2: Tải lại hồ sơ bệnh án đang khám dở kèm kết quả xét nghiệm
  loadExistingRecord(ticketId: number): void {
    this.medicalService.getMedicalRecordByTicketId(ticketId).subscribe({
      next: res => {
        if (res.data) {
          const record = res.data;
          this.existingRecordId.set(record.id);
          if (record.bloodPressure) this.bloodPressure = record.bloodPressure;
          if (record.heartRate) this.heartRate = record.heartRate;
          if (record.temperature) this.temperature = record.temperature;
          if (record.weight) this.weight = record.weight;
          if (record.height) this.height = record.height;
          if (record.vitalSigns) this.vitalSignsNotes = record.vitalSigns;
          if (record.symptoms) this.symptoms = record.symptoms;
          if (record.preliminaryDiagnosis) this.preliminaryDiagnosis = record.preliminaryDiagnosis;
          if (record.finalDiagnosis) this.finalDiagnosis = record.finalDiagnosis;
          if (record.icd10Code) this.icd10Code = record.icd10Code;
          if (record.notes) this.notes = record.notes;

          if (record.labOrders && record.labOrders.length > 0) {
            this.labOrders.set(record.labOrders);
          } else {
            this.labOrders.set([]);
          }
        }
      },
      error: () => {
        this.existingRecordId.set(null);
        this.labOrders.set([]);
      }
    });
  }

  closeLabPrintModalAndClear(): void {
    this.showLabPrintModal.set(false);
    this.lastSentLabRecord.set(null);
    this.selectedLabServices.set([]);
    this.symptoms = '';
    this.preliminaryDiagnosis = '';
    this.finalDiagnosis = '';
    this.bloodPressure = '';
    this.heartRate = null;
    this.temperature = null;
    this.weight = null;
    this.height = null;
    this.vitalSignsNotes = '';
    this.currentTicket.set(null);
    this.ticketId.set(null);
    this.router.navigate(['/doctor/calling']);
  }

  // Nơi bệnh nhân sang làm: nhóm "Chẩn đoán hình ảnh" ở các phòng CĐHA, còn lại ở phòng xét nghiệm (giống quy tắc backend)
  labRoomOf(service: LabService): string {
    const department = service.category === 'Chẩn đoán hình ảnh' ? 'CHAN_DOAN_HINH_ANH' : 'XET_NGHIEM';
    const rooms = this.labRooms().filter(r => r.roomType === department);
    return rooms.length ? rooms.map(r => `${r.roomNumber} (${r.roomName})`).join(' hoặc ') : '---';
  }

  printLabOrderDocument(): void {
    window.print();
  }

  showAlert(msg: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 6000);
  }
}
