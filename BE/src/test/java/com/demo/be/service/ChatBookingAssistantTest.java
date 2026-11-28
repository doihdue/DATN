package com.demo.be.service;

import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.model.Specialty;
import com.demo.be.service.ai.ChatBookingAssistant;
import com.demo.be.service.ai.ChatBookingAssistant.BookingIntent;
import com.demo.be.service.ai.ChatBookingAssistant.BookingLookup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatBookingAssistantTest {

    // Thứ Sáu
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 27);
    private static final Specialty NHI = Specialty.builder().id(2L).name("Khoa Nhi").build();

    @Mock private AppointmentService appointmentService;
    private ChatBookingAssistant assistant;
    private final List<WorkScheduleResponse> db = new ArrayList<>();
    private long nextId = 1;

    @BeforeEach
    void setUp() {
        assistant = new ChatBookingAssistant(appointmentService);
        // Giả lập API tra ca trống: lọc theo khoảng ngày và khoa
        lenient().when(appointmentService.getAvailableSchedules(any(), any(), isNull(), anyLong())).thenAnswer(inv -> {
            LocalDate from = inv.getArgument(0);
            LocalDate to = inv.getArgument(1);
            Long specialtyId = inv.getArgument(3);
            return db.stream()
                    .filter(s -> !s.getWorkDate().isBefore(from) && !s.getWorkDate().isAfter(to))
                    .filter(s -> s.getSpecialtyId().equals(specialtyId))
                    .toList();
        });
    }

    private void schedule(LocalDate date, int startHour, int remaining) {
        db.add(WorkScheduleResponse.builder().id(nextId++).workDate(date)
                .startTime(LocalTime.of(startHour, 0)).endTime(LocalTime.of(startHour + 4, 0))
                .remainingSlots(remaining).specialtyId(NHI.getId()).specialtyName(NHI.getName())
                .doctorName("BS A").build());
    }

    private BookingLookup lookup(LocalDate date, String shift) {
        return assistant.lookup(new BookingIntent(NHI, date, shift), TODAY);
    }

    @Test
    void ngayCoCaTrong_traDungCacCaCuaNgayDo() {
        LocalDate friday = TODAY.plusDays(7);
        schedule(friday, 7, 5);
        schedule(friday, 13, 3);
        schedule(friday.plusDays(1), 7, 5);

        BookingLookup result = lookup(friday, "ANY");

        assertThat(result.schedules()).hasSize(2).allMatch(s -> s.getWorkDate().equals(friday));
        assertThat(result.content()).contains("Khoa Nhi còn 2 ca khám", "Thứ Sáu, 04/12/2026");
    }

    @Test
    void locTheoBuoiSangChieu() {
        LocalDate day = TODAY.plusDays(1);
        schedule(day, 7, 5);
        schedule(day, 13, 3);

        assertThat(lookup(day, "AFTERNOON").schedules()).extracting(WorkScheduleResponse::getStartTime)
                .containsExactly(LocalTime.of(13, 0));
        assertThat(lookup(day, "MORNING").content()).contains("buổi sáng");
    }

    @Test
    void ngayDaKin_goiYCacCaGanNhatSauDo() {
        LocalDate day = TODAY.plusDays(2);
        schedule(day, 7, 0); // hết chỗ
        schedule(day.plusDays(3), 7, 4);

        BookingLookup result = lookup(day, "ANY");

        assertThat(result.content()).contains("không còn ca khám trống", "các ca gần nhất");
        assertThat(result.schedules()).extracting(WorkScheduleResponse::getWorkDate).containsExactly(day.plusDays(3));
    }

    @Test
    void khongNeuNgay_goiYCaGanNhatTuHomNay() {
        schedule(TODAY.plusDays(5), 13, 2);
        schedule(TODAY.plusDays(1), 7, 2);

        BookingLookup result = lookup(null, "ANY");

        assertThat(result.schedules()).extracting(WorkScheduleResponse::getWorkDate)
                .containsExactly(TODAY.plusDays(1), TODAY.plusDays(5));
    }

    @Test
    void ngayDaQuaHoacQuaXa_baoLyDoVaGoiYCaGanNhat() {
        schedule(TODAY.plusDays(1), 7, 2);

        assertThat(lookup(TODAY.minusDays(1), "ANY").content()).startsWith("Ngày 26/11/2026 đã qua");
        BookingLookup far = lookup(TODAY.plusDays(60), "ANY");
        assertThat(far.content()).contains("tối đa 30 ngày");
        assertThat(far.schedules()).hasSize(1);
    }

    @Test
    void khongCoCaNao_baoChuaCoLich() {
        BookingLookup result = lookup(TODAY.plusDays(1), "ANY");

        assertThat(result.schedules()).isEmpty();
        assertThat(result.content()).contains("chưa có ca khám nào còn chỗ");
    }

    @Test
    void gioiHanSoCaHienThi() {
        for (int i = 0; i < 5; i++) {
            schedule(TODAY.plusDays(i + 1), 7, 2);
            schedule(TODAY.plusDays(i + 1), 13, 2);
        }
        assertThat(lookup(null, "ANY").schedules()).hasSize(6);
    }
}
