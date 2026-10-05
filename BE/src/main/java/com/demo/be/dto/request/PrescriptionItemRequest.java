package com.demo.be.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItemRequest {

    @NotNull(message = "ID thuốc không được để trống")
    private Long medicineId;

    @NotNull(message = "Số lượng thuốc không được để trống")
    @Min(value = 1, message = "Số lượng thuốc phải lớn hơn hoặc bằng 1")
    private Integer quantity;

    private String dosage; // Liều lượng: VD "1 viên/lần, 2 lần/ngày"

    private String route; // Đường dùng: VD "Đường uống", "Bôi ngoài da"

    private Integer daysSupply; // Số ngày dùng: VD 5, 7, 10

    private String instructions; // Hướng dẫn sử dụng chi tiết
}
