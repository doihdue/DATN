package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatMessageRequest {

    // Null ở tin nhắn đầu tiên; server tạo mới và trả về để client gửi kèm ở các tin sau
    @Size(max = 100, message = "Mã phiên chat không hợp lệ")
    private String sessionKey;

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự")
    private String message;
}
