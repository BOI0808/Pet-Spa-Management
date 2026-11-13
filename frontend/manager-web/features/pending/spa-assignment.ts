import type { SpaSuggestions, StaffSuggestion } from "@/lib/api/types";

/** Nhân viên Quản lý có thể chọn cho lịch spa: người được đề xuất rồi đến người thay thế (MW-04 vùng 5). */
export function getCandidates(suggestions: SpaSuggestions): StaffSuggestion[] {
  return [...suggestions.suggested, ...suggestions.alternatives];
}

/**
 * Lựa chọn đang có hiệu lực. Chưa chọn tay (`manualIds` là `null`) thì lấy những người được đề xuất; đã chọn tay thì giữ lại,
 * bỏ người không còn trong danh sách sau khi tải lại đề xuất và không vượt quá số nhân viên lịch cần.
 */
export function resolveSelection(suggestions: SpaSuggestions, manualIds: readonly string[] | null): string[] {
  if (manualIds === null) {
    return suggestions.suggested.slice(0, suggestions.staffRequired).map((staff) => staff.staffId);
  }
  const candidateIds = new Set(getCandidates(suggestions).map((staff) => staff.staffId));
  return manualIds.filter((staffId) => candidateIds.has(staffId)).slice(0, suggestions.staffRequired);
}

/**
 * Bật/tắt một nhân viên. Lịch cần 1 người thì chọn người mới là thay người cũ; lịch cần 2 người thì chọn thêm tới đủ 2, muốn đổi
 * phải bỏ chọn một người trước (khi đã đủ, thêm người thứ ba bị bỏ qua).
 */
export function toggleStaff(selectedIds: readonly string[], staffId: string, staffRequired: number): string[] {
  if (staffRequired === 1) return [staffId];
  if (selectedIds.includes(staffId)) return selectedIds.filter((id) => id !== staffId);
  return selectedIds.length < staffRequired ? [...selectedIds, staffId] : [...selectedIds];
}
