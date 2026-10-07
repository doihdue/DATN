export interface MedicineCategory {
  id: number;
  code?: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  medicineCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicineCategoryRequest {
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}
