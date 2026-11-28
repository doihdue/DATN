import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ChatService } from './chat.service';

const URL = 'http://localhost:8080/api/chat/messages';

describe('ChatService', () => {
  let service: ChatService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function reply(sessionKey: string, extra: object = {}) {
    return {
      success: true,
      data: { sessionKey, content: 'Trả lời', isEmergency: false, suggestedSpecialties: [], source: 'AI', ...extra }
    };
  }

  it('gửi tin nhắn đầu tiên không kèm mã phiên và trả về dữ liệu trong ApiResponse', async () => {
    const result = firstValueFrom(service.sendMessage('đau họng'));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sessionKey: null, message: 'đau họng' });
    req.flush(reply('abc'));

    expect((await result).content).toBe('Trả lời');
  });

  it('gửi kèm mã phiên server cấp ở các tin nhắn sau, xoá khi bắt đầu cuộc mới', async () => {
    const first = firstValueFrom(service.sendMessage('đau họng'));
    http.expectOne(URL).flush(reply('abc'));
    await first;

    const second = firstValueFrom(service.sendMessage('3 ngày'));
    const secondReq = http.expectOne(URL);
    expect(secondReq.request.body.sessionKey).toBe('abc');
    secondReq.flush(reply('abc'));
    await second;

    service.resetSession();
    const third = firstValueFrom(service.sendMessage('xin chào'));
    const thirdReq = http.expectOne(URL);
    expect(thirdReq.request.body.sessionKey).toBeNull();
    thirdReq.flush(reply('xyz'));
    await third;
  });

  it('luôn trả mảng gợi ý kể cả khi server bỏ trống', async () => {
    const result = firstValueFrom(service.sendMessage('xin chào'));
    http.expectOne(URL).flush(reply('abc', { suggestedSpecialties: null }));

    expect((await result).suggestedSpecialties).toEqual([]);
  });

  it('giữ mã phiên qua lần tải lại trang (sessionStorage) và lấy lại lịch sử', async () => {
    const first = firstValueFrom(service.sendMessage('đau họng'));
    http.expectOne(URL).flush(reply('abc'));
    await first;

    // Mô phỏng tải lại trang: service mới đọc lại mã phiên đã lưu
    const reloaded = TestBed.runInInjectionContext(() => new ChatService());
    expect(reloaded.hasSession()).toBe(true);

    const history = firstValueFrom(reloaded.loadHistory());
    const req = http.expectOne('http://localhost:8080/api/chat/sessions/abc/messages');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [{ id: 1, sender: 'USER', content: 'đau họng', createdAt: '2026-11-28T10:00:00', isEmergency: false, suggestedSpecialties: null }] });
    expect((await history)[0].suggestedSpecialties).toEqual([]);

    reloaded.resetSession();
    expect(sessionStorage.getItem('medqueue.chat.sessionKey')).toBeNull();
  });

  it('chưa có phiên thì không gọi API lịch sử', async () => {
    expect(service.hasSession()).toBe(false);
    expect(await firstValueFrom(service.loadHistory())).toEqual([]);
  });
});
