package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabCategoryRequest {

    @NotBlank(message = "Tên loại xét nghiệm không được để trống")
    private String name;

    @NotBlank(message = "Vui lòng chọn khoa thực hiện")
    @Pattern(regexp = "XET_NGHIEM|CHAN_DOAN_HINH_ANH", message = "Khoa thực hiện không hợp lệ")
    private String department;

    private String description;
}
