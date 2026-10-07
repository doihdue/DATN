package com.demo.be.service;

import com.demo.be.dto.request.MedicineCategoryRequest;
import com.demo.be.dto.response.MedicineCategoryResponse;

import java.util.List;

public interface MedicineCategoryService {
    List<MedicineCategoryResponse> getAllCategories();
    List<MedicineCategoryResponse> getActiveCategories();
    MedicineCategoryResponse getCategoryById(Long id);
    MedicineCategoryResponse createCategory(MedicineCategoryRequest request);
    MedicineCategoryResponse updateCategory(Long id, MedicineCategoryRequest request);
    void deleteCategory(Long id);
}
