package com.demo.be.service;

import com.demo.be.dto.request.LabCategoryRequest;
import com.demo.be.dto.request.LabServiceRequest;
import com.demo.be.dto.response.LabCategoryResponse;
import com.demo.be.dto.response.LabServiceResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.LabCategory;
import com.demo.be.model.LabService;
import com.demo.be.repository.LabCategoryRepository;
import com.demo.be.repository.LabServiceRepository;
import com.demo.be.service.impl.LabCatalogServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LabCatalogServiceTest {

    @Mock private LabServiceRepository labServiceRepository;
    @Mock private LabCategoryRepository labCategoryRepository;

    @InjectMocks
    private LabCatalogServiceImpl service;

    private final LabCategory imaging = LabCategory.builder().id(7L).name("Chẩn đoán hình ảnh")
            .department(LabCategory.CHAN_DOAN_HINH_ANH).build();
    private final LabCategory blood = LabCategory.builder().id(1L).name("Huyết học")
            .department(LabCategory.XET_NGHIEM).build();

    private LabServiceRequest request(Long categoryId) {
        return LabServiceRequest.builder().serviceCode("cdha-mri-01").serviceName("Chụp MRI cột sống")
                .categoryId(categoryId).price(2500000.0).unit("Lần").build();
    }

    @Test
    void createService_linksCategory_andDepartmentFollowsCategory() {
        when(labServiceRepository.findByServiceCode("CDHA-MRI-01")).thenReturn(Optional.empty());
        when(labCategoryRepository.findById(7L)).thenReturn(Optional.of(imaging));
        when(labServiceRepository.save(any(LabService.class))).thenAnswer(inv -> inv.getArgument(0));

        LabServiceResponse res = service.createService(request(7L));

        assertThat(res.getServiceCode()).isEqualTo("CDHA-MRI-01");
        assertThat(res.getCategoryId()).isEqualTo(7L);
        assertThat(res.getCategory()).isEqualTo("Chẩn đoán hình ảnh");
        assertThat(res.getDepartment()).isEqualTo(LabCategory.CHAN_DOAN_HINH_ANH);
    }

    @Test
    void createService_unknownCategory_isRejected() {
        when(labServiceRepository.findByServiceCode("CDHA-MRI-01")).thenReturn(Optional.empty());
        when(labCategoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createService(request(99L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Loại xét nghiệm không tồn tại");
        verify(labServiceRepository, never()).save(any());
    }

    @Test
    void updateService_canMoveServiceToAnotherCategory() {
        LabService existing = LabService.builder().id(5L).serviceCode("XN-HEM-01").serviceName("CTM")
                .category(blood).price(120000.0).build();
        when(labServiceRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(labCategoryRepository.findById(7L)).thenReturn(Optional.of(imaging));
        when(labServiceRepository.save(any(LabService.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateService(5L, request(7L));

        assertThat(existing.getCategory()).isSameAs(imaging);
        assertThat(existing.getDepartment()).isEqualTo(LabCategory.CHAN_DOAN_HINH_ANH);
        assertThat(existing.getServiceCode()).isEqualTo("XN-HEM-01"); // mã không đổi khi sửa
    }

    @Test
    void serviceWithoutCategory_defaultsToLabDepartment() {
        assertThat(LabService.builder().build().getDepartment()).isEqualTo(LabCategory.XET_NGHIEM);
    }

    @Test
    void getCategories_includesActiveServiceCount() {
        when(labCategoryRepository.findAllByOrderByDepartmentDescNameAsc()).thenReturn(List.of(blood, imaging));
        when(labServiceRepository.countActiveByCategory()).thenReturn(List.<Object[]>of(new Object[]{1L, 3L}));

        List<LabCategoryResponse> res = service.getCategories();

        assertThat(res).extracting(LabCategoryResponse::getName).containsExactly("Huyết học", "Chẩn đoán hình ảnh");
        assertThat(res).extracting(LabCategoryResponse::getServiceCount).containsExactly(3L, 0L);
    }

    @Test
    void createCategory_duplicateName_isRejected() {
        when(labCategoryRepository.findByNameIgnoreCase("huyết học")).thenReturn(Optional.of(blood));

        assertThatThrownBy(() -> service.createCategory(
                LabCategoryRequest.builder().name(" huyết học ").department(LabCategory.XET_NGHIEM).build()))
                .isInstanceOf(BadRequestException.class);
        verify(labCategoryRepository, never()).save(any());
    }
}
