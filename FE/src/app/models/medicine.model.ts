export interface Medicine {
  id: number;
  code?: string;
  name: string;
  activeIngredient?: string;
  dosageForm?: string;
  unit?: string;
  price?: number;
  packaging?: string;
  routeOfAdministration?: string;
  stockQuantity?: number;
  isActive?: boolean;
  contraindications?: string;
  defaultUsageInstructions?: string;
  categoryId?: number;
  categoryName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicineRequest {
  code?: string;
  name: string;
  activeIngredient?: string;
  dosageForm?: string;
  unit?: string;
  price?: number;
  packaging?: string;
  routeOfAdministration?: string;
  stockQuantity?: number;
  isActive?: boolean;
  contraindications?: string;
  defaultUsageInstructions?: string;
  categoryId?: number;
}
