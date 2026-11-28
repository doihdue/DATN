import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { computed } from '@angular/core';
import { Appointment } from '../../models/appointment.model';
import { ChatHistoryMessage, ChatReply } from '../../models/chat.model';
import { WorkSchedule } from '../../models/schedule.model';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatWidgetComponent } from './chat-widget.component';

const REPLY: ChatReply = { content: 'Trả lời', isEmergency: false, suggestedSpecialties: [] };

const SCHEDULE = {
  id: 7, workDate: '2026-12-04', shiftType: 'MORNING', startTime: '07:30:00', endTime: '11:30:00',
  maxPatients: 20, currentBookedCount: 5, remainingSlots: 15, status: 'AVAILABLE',
  doctorId: 1, doctorName: 'Nguyễn Văn A', academicTitle: 'ThS.BS', specialtyId: 2, specialtyName: 'Khoa Nhi',
  examinationRoomId: 3, roomNumber: 'P101', roomName: 'Phòng 101', floor: 1
} as WorkSchedule;

const SCHEDULE_REPLY: ChatReply = {
  ...REPLY, content: 'Khoa Nhi còn 1 ca khám', bookingSpecialtyId: 2, availableSchedules: [SCHEDULE]
};

function setup(
  sendMessage: (message: string) => Observable<ChatReply>,
  options: {
    roles?: string[];
    bookAppointment?: (req: unknown) => Observable<unknown>;
    history?: () => Observable<ChatHistoryMessage[]>;
  } = {}
) {
  const currentUser = signal<{ username: string; roles: string[] } | null>({
    username: 'an', roles: options.roles ?? ['ROLE_PATIENT']
  });
  const bookAppointment = vi.fn(options.bookAppointment ?? (() => new Subject().asObservable()));
  const loadHistory = vi.fn(options.history ?? ((): Observable<ChatHistoryMessage[]> => of([])));
  const resetSession = vi.fn();
  TestBed.configureTestingModule({
    imports: [ChatWidgetComponent],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          currentUser,
          isAuthenticated: computed(() => currentUser() !== null),
          hasRole: (role: string) => currentUser()?.roles.includes(`ROLE_${role}`) ?? false
        }
      },
      { provide: ChatService, useValue: { sendMessage, resetSession, loadHistory, hasSession: () => !!options.history } },
      { provide: AppointmentService, useValue: { bookAppointment } }
    ]
  });
  const fixture = TestBed.createComponent(ChatWidgetComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, currentUser, bookAppointment, loadHistory, resetSession };
}

describe('ChatWidgetComponent', () => {
  it('thêm tin nhắn người dùng và câu trả lời, chặn gửi khi đang chờ', () => {
    const reply$ = new Subject<ChatReply>();
    const sendMessage = vi.fn(() => reply$.asObservable());
    const { component } = setup(sendMessage);

    component.send('  đau họng  ');
    component.send('tin nhắn thứ hai');

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('đau họng');
    expect(component.isSending()).toBe(true);

    reply$.next(REPLY);

    expect(component.isSending()).toBe(false);
    expect(component.messages().map(message => message.sender)).toEqual(['USER', 'AI']);
  });

  it('bỏ qua tin nhắn rỗng', () => {
    const sendMessage = vi.fn(() => new Subject<ChatReply>().asObservable());
    const { component } = setup(sendMessage);

    component.send('   ');

    expect(sendMessage).not.toHaveBeenCalled();
    expect(component.messages()).toEqual([]);
  });

  it('thử lại đúng tin nhắn lỗi mà không thêm tin nhắn trùng', () => {
    const sendMessage = vi.fn((): Observable<ChatReply> => throwError(() => new Error('lỗi')));
    const { component } = setup(sendMessage);

    component.send('đau đầu');
    expect(component.hasError()).toBe(true);

    component.retry();

    expect(sendMessage).toHaveBeenLastCalledWith('đau đầu');
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(component.messages()).toHaveLength(1);
  });

  it('đặt lịch từ ca khám trong khung chat và hiện thẻ đặt lịch thành công', () => {
    const appointment = { appointmentCode: 'LH20261204-0001', bookingNumber: 6, appointmentDate: '2026-12-04' } as Appointment;
    const { component, fixture, bookAppointment } = setup(() => of(SCHEDULE_REPLY), {
      bookAppointment: () => of({ success: true, data: appointment })
    });

    component.send('Đặt lịch khoa Nhi thứ 6 tuần sau');
    const aiMessage = component.messages()[1];
    expect(aiMessage.availableSchedules).toEqual([SCHEDULE]);

    component.selectSchedule(aiMessage.id, SCHEDULE);
    component.bookingReason.set('  Bé ho 3 ngày  ');
    component.confirmBooking();

    expect(bookAppointment).toHaveBeenCalledWith({ workScheduleId: 7, reasonForVisit: 'Bé ho 3 ngày' });
    expect(component.selected()).toBeNull();
    expect(component.bookedScheduleIds().has(7)).toBe(true);
    expect(component.messages()[1].availableSchedules?.[0].remainingSlots).toBe(14);
    expect(component.messages().at(-1)?.appointment).toEqual(appointment);

    component.isOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LH20261204-0001');
    expect(fixture.nativeElement.textContent).toContain('Thứ Sáu, 04/12/2026');
  });

  it('đặt lịch lỗi thì giữ khung xác nhận và hiện lý do từ server', () => {
    const { component } = setup(() => of(SCHEDULE_REPLY), {
      bookAppointment: () => throwError(() => new HttpErrorResponse({
        status: 400, error: { success: false, message: 'Ca khám này đã đủ số lượng bệnh nhân' }
      }))
    });

    component.send('Đặt lịch khoa Nhi');
    component.selectSchedule(component.messages()[1].id, SCHEDULE);
    component.confirmBooking();

    expect(component.bookingError()).toBe('Ca khám này đã đủ số lượng bệnh nhân');
    expect(component.selected()?.schedule.id).toBe(7);
    expect(component.isBooking()).toBe(false);
  });

  it('chỉ tài khoản bệnh nhân mới thấy nút chọn ca khám', () => {
    const { component, fixture } = setup(() => of(SCHEDULE_REPLY), { roles: ['ROLE_STAFF'] });

    component.send('Đặt lịch khoa Nhi');
    component.isOpen.set(true);
    fixture.detectChanges();

    expect(component.isPatient()).toBe(false);
    expect(fixture.nativeElement.querySelector('.schedule-action')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Chỉ tài khoản bệnh nhân mới đặt lịch khám được');
  });

  it('nút "Xem lịch khám" trên thẻ gợi ý gửi yêu cầu đặt lịch khoa đó', () => {
    const sendMessage = vi.fn(() => new Subject<ChatReply>().asObservable());
    const { component } = setup(sendMessage);

    component.askSchedules('Khoa Mắt');

    expect(sendMessage).toHaveBeenCalledWith('Tôi muốn đặt lịch khám Khoa Mắt');
  });

  it('lỗi 400 hiện thông báo của server và không cho thử lại', () => {
    const sendMessage = vi.fn((): Observable<ChatReply> => throwError(() => new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'Cuộc trò chuyện đã quá dài' }
    })));
    const { component } = setup(sendMessage);

    component.send('đau đầu');

    expect(component.errorText()).toBe('Cuộc trò chuyện đã quá dài');
    expect(component.canRetry()).toBe(false);
  });

  it('hiện nhãn chế độ dự phòng khi câu trả lời gần nhất không đến từ AI', () => {
    const replies = [{ ...REPLY, source: 'FALLBACK' as const }, { ...REPLY, source: 'AI' as const }];
    const { component } = setup(() => of(replies.shift()!));

    component.send('đau họng');
    expect(component.isFallbackMode()).toBe(true);

    component.send('3 ngày');
    expect(component.isFallbackMode()).toBe(false);
  });

  it('không gửi khi đang ghép ký tự bằng bộ gõ, có gửi khi nhấn Enter', () => {
    const sendMessage = vi.fn(() => new Subject<ChatReply>().asObservable());
    const { component } = setup(sendMessage);
    component.draft.set('ho');

    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }));
    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(sendMessage).not.toHaveBeenCalled();

    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sendMessage).toHaveBeenCalledWith('ho');
  });

  it('xoá cuộc trò chuyện và bỏ câu trả lời đang chờ khi đổi người dùng', () => {
    const reply$ = new Subject<ChatReply>();
    const { component, currentUser } = setup(() => reply$.asObservable());

    component.send('đau họng');
    currentUser.set(null);
    TestBed.tick();
    reply$.next(REPLY);

    expect(component.messages()).toEqual([]);
    expect(component.isSending()).toBe(false);
  });

  it('mở khung chat sau khi tải lại trang thì hiện lại lịch sử, chỉ tải một lần', () => {
    const history$ = new Subject<ChatHistoryMessage[]>();
    const { component, fixture, loadHistory } = setup(() => of(REPLY), { history: () => history$.asObservable() });

    component.toggle();
    expect(component.isLoadingHistory()).toBe(true);
    expect(component.canSend()).toBe(false);

    history$.next([
      { id: 1, sender: 'USER', content: 'Đặt lịch khoa Nhi', createdAt: '2026-11-28T09:15:00', isEmergency: false, suggestedSpecialties: [] },
      {
        id: 2, sender: 'AI', content: 'Khoa Nhi còn 2 ca khám', createdAt: '2026-11-28T09:15:02', isEmergency: false,
        source: 'FALLBACK', suggestedSpecialties: [], bookingSpecialty: 'Khoa Nhi'
      }
    ]);
    fixture.detectChanges();

    expect(component.isLoadingHistory()).toBe(false);
    expect(component.messages().map(m => m.content)).toEqual(['Đặt lịch khoa Nhi', 'Khoa Nhi còn 2 ca khám']);
    expect(component.messages()[1].staleBookingSpecialty).toBe('Khoa Nhi');
    expect(component.isFallbackMode()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Xem lại lịch còn trống');

    component.close();
    component.toggle();
    expect(loadHistory).toHaveBeenCalledTimes(1);
  });

  it('phiên đã lưu không còn hợp lệ (404) thì bỏ mã phiên và bắt đầu cuộc mới', () => {
    const { component, resetSession } = setup(() => of(REPLY), {
      history: () => throwError(() => new HttpErrorResponse({ status: 404 }))
    });

    component.toggle();

    expect(resetSession).toHaveBeenCalled();
    expect(component.messages()).toEqual([]);
    expect(component.isLoadingHistory()).toBe(false);
  });

  it('chưa có phiên thì không gọi API lịch sử', () => {
    const { component, loadHistory } = setup(() => of(REPLY));

    component.toggle();

    expect(loadHistory).not.toHaveBeenCalled();
  });
});
