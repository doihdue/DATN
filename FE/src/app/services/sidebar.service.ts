import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  /**
   * Trạng thái ghim cố định Sidebar mở rộng (250px)
   */
  readonly isPinned = signal<boolean>(false);

  /**
   * Trạng thái rê chuột mở rộng tạm thời
   */
  readonly isHovered = signal<boolean>(false);

  /**
   * Sidebar mở rộng khi được ghim HOẶC khi đang rê chuột
   */
  readonly isExpanded = computed(() => this.isPinned() || this.isHovered());

  setHovered(hovered: boolean): void {
    this.isHovered.set(hovered);
  }

  togglePin(): void {
    this.isPinned.update(p => !p);
  }

  /**
   * Tự động thu gọn hover khi click vào một menu item để tránh che nội dung trang
   */
  closeOnNavigate(): void {
    if (!this.isPinned()) {
      this.isHovered.set(false);
    }
  }
}
