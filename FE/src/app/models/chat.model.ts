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
}

export interface ChatMessage {
  id: number;
  sender: ChatSender;
  content: string;
  createdAt: Date;
  isEmergency?: boolean;
  suggestedSpecialties?: ChatSpecialtySuggestion[];
  source?: ChatReplySource;
}
