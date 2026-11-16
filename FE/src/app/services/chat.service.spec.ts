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
});
