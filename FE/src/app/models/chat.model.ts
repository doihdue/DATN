import { Appointment } from './appointment.model';
import { WorkSchedule } from './schedule.model';

export type ChatSender = 'USER' | 'AI';

// AI = Gemini trả lời; SAFETY_RULE = luật cấp cứu chặn trước; FALLBACK = AI chưa sẵn sàng, gợi ý theo từ khóa
export type ChatReplySource = 'AI' | 'SAFETY_RULE' | 'FALLBACK';

export interface ChatSpecialtySuggestion {
  name: string;
  reason: string;
}

export interface ChatReply {
  sessionKey?: string;
  content: string;
  isEmergency: boolean;
  suggestedSpecialties: ChatSpecialtySuggestion[];
  source?: ChatReplySource;
  // Đặt lịch qua chat: khoa đã tra cứu và các ca khám còn chỗ (lấy từ DB, không do AI tự sinh)
  bookingSpecialtyId?: number | null;
  bookingSpecialty?: string | null;
  availableSchedules?: WorkSchedule[];
}

// Tin nhắn trong lịch sử phiên chat do server trả về khi tải lại trang
export interface ChatHistoryMessage {
  id: number;
  sender: ChatSender;
  content: string;
  createdAt: string;
  isEmergency: boolean;
  source?: ChatReplySource | null;
  suggestedSpecialties: ChatSpecialtySuggestion[];
  bookingSpecialty?: string | null;
}

export interface ChatMessage {
  id: number;
  sender: ChatSender;
  content: string;
  createdAt: Date;
  isEmergency?: boolean;
  suggestedSpecialties?: ChatSpecialtySuggestion[];
  source?: ChatReplySource;
  availableSchedules?: WorkSchedule[];
  // Tin nhắn tra lịch lấy lại từ lịch sử: không còn danh sách ca (số chỗ có thể đã đổi), chỉ cho hỏi lại khoa này
  staleBookingSpecialty?: string;
  // Lịch hẹn vừa đặt thành công ngay trong khung chat
  appointment?: Appointment;
}
