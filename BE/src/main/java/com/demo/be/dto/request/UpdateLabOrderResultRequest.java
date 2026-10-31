package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLabOrderResultRequest {

    @NotBlank(message = "Kết quả xét nghiệm không được để trống")
    private String resultValue;

    private String conclusion; // Nhận xét, kết luận

    private String notes; // Ghi chú thêm

    private Boolean isAbnormal; // Đánh dấu chỉ số bất thường (để trống thì tự so với ngưỡng tham chiếu)
}
