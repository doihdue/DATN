package com.demo.be.service.ai;

import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.model.Specialty;
import com.demo.be.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

/**
 * Tra cứu ca khám còn chỗ cho yêu cầu đặt lịch trong khung chat.
 * AI chỉ hiểu ý người dùng (khoa nào, ngày nào, buổi nào); danh sách ca khám và nội dung trả lời về lịch
 * luôn lấy từ dữ liệu thật trong DB, để AI không thể "bịa" ra giờ khám hay tên bác sĩ.
 */
@Component
@RequiredArgsConstructor
public class ChatBookingAssistant {

    public static final String SHIFT_MORNING = "MORNING";
    public static final String SHIFT_AFTERNOON = "AFTERNOON";
    public static final String SHIFT_ANY = "ANY";

    static final int MAX_SCHEDULES = 6;
    // Khi ngày được hỏi đã kín lịch / không có ca: tìm ca thay thế trong N ngày kế tiếp
    static final int ALTERNATIVE_DAYS = 7;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final LocalTime NOON = LocalTime.NOON;

    private final AppointmentService appointmentService;

    @Value("${appointment.max-days-ahead:30}")
    private int maxDaysAhead = 30;

    /** Ý định đặt lịch AI đọc được từ câu chat. specialty/date có thể null nếu người dùng chưa nói. */
    public record BookingIntent(Specialty specialty, LocalDate date, String shift) {}

    /** Kết quả tra cứu: câu trả lời (dựa trên dữ liệu thật) và danh sách ca khám để hiển thị. */
    public record BookingLookup(String content, List<WorkScheduleResponse> schedules) {}

    public int getMaxDaysAhead() {
        return maxDaysAhead;
    }

    public BookingLookup lookup(BookingIntent intent, LocalDate today) {
        Specialty specialty = intent.specialty();
        String shift = normalizeShift(intent.shift());
        LocalDate lastBookable = today.plusDays(maxDaysAhead);
        LocalDate date = intent.date();

        String prefix = "";
        if (date != null && date.isBefore(today)) {
            prefix = "Ngày " + formatDate(date) + " đã qua nên không thể đặt lịch. ";
            date = null;
        } else if (date != null && date.isAfter(lastBookable)) {
            prefix = "Phòng khám chỉ nhận đặt lịch trước tối đa " + maxDaysAhead + " ngày (đến "
                    + formatDate(lastBookable) + "). ";
            date = null;
        }

        String target = specialty.getName();
        if (date != null) {
            List<WorkScheduleResponse> onDate = find(specialty, date, date, shift);
            if (!onDate.isEmpty()) {
                return new BookingLookup(prefix + target + " còn " + onDate.size() + " ca khám" + shiftLabel(shift)
                        + " vào " + formatDay(date) + ". Bạn chọn ca phù hợp bên dưới để đặt lịch nhé.", onDate);
            }
            prefix += target + " không còn ca khám trống" + shiftLabel(shift) + " vào " + formatDay(date) + ". ";
        }

        // Không nêu ngày, ngày không hợp lệ hoặc ngày đó đã kín: gợi ý các ca gần nhất còn chỗ
        LocalDate from = date != null ? date.plusDays(1) : today;
        LocalDate to = min(from.plusDays(ALTERNATIVE_DAYS - 1), lastBookable);
        List<WorkScheduleResponse> nearest = find(specialty, from, to, shift);
        if (nearest.isEmpty() && !SHIFT_ANY.equals(shift)) {
            nearest = find(specialty, from, to, SHIFT_ANY);
        }

        if (nearest.isEmpty()) {
            return new BookingLookup(prefix + "Hiện " + target + " chưa có ca khám nào còn chỗ trong "
                    + ALTERNATIVE_DAYS + " ngày " + (date != null ? "sau đó" : "tới")
                    + ". Bạn có thể hỏi ngày khác hoặc xem toàn bộ lịch ở trang Đặt lịch khám.",
                    List.of());
        }
        String lead = date != null ? "Dưới đây là các ca gần nhất còn chỗ của " + target + ":"
                : "Đây là các ca khám gần nhất còn chỗ của " + target + ". Bạn chọn ca phù hợp bên dưới để đặt lịch nhé.";
        return new BookingLookup(prefix + lead, nearest);
    }

    private List<WorkScheduleResponse> find(Specialty specialty, LocalDate from, LocalDate to, String shift) {
        return appointmentService.getAvailableSchedules(from, to, null, specialty.getId()).stream()
                .filter(s -> s.getRemainingSlots() == null || s.getRemainingSlots() > 0)
                .filter(s -> matchesShift(s, shift))
                .sorted(Comparator.comparing(WorkScheduleResponse::getWorkDate)
                        .thenComparing(WorkScheduleResponse::getStartTime))
                .limit(MAX_SCHEDULES)
                .toList();
    }

    private static boolean matchesShift(WorkScheduleResponse s, String shift) {
        if (SHIFT_ANY.equals(shift) || s.getStartTime() == null) return true;
        boolean morning = s.getStartTime().isBefore(NOON);
        return SHIFT_MORNING.equals(shift) == morning;
    }

    static String normalizeShift(String shift) {
        if (SHIFT_MORNING.equalsIgnoreCase(shift)) return SHIFT_MORNING;
        if (SHIFT_AFTERNOON.equalsIgnoreCase(shift)) return SHIFT_AFTERNOON;
        return SHIFT_ANY;
    }

    private static String shiftLabel(String shift) {
        return switch (shift) {
            case SHIFT_MORNING -> " buổi sáng";
            case SHIFT_AFTERNOON -> " buổi chiều";
            default -> "";
        };
    }

    public static String formatDay(LocalDate date) {
        return dayOfWeek(date) + ", " + formatDate(date);
    }

    public static String formatDate(LocalDate date) {
        return date.format(DATE_FORMAT);
    }

    public static String dayOfWeek(LocalDate date) {
        DayOfWeek d = date.getDayOfWeek();
        return switch (d) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }
}
