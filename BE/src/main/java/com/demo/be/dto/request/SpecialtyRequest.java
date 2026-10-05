package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecialtyRequest {

    @NotBlank(message = "Tên chuyên khoa không được để trống")
    @Size(max = 150, message = "Tên chuyên khoa tối đa 150 ký tự")
    private String name;

    private String description;

    @Size(max = 500, message = "Đường dẫn icon tối đa 500 ký tự")
    private String iconUrl;
}
