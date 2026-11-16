package com.demo.be.email.service.impl;

import com.demo.be.email.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from-address:phongkham.smartclinic.datn@gmail.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:Phòng Khám Thông Minh SmartClinic}")
    private String fromName;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Async("emailTaskExecutor")
    @Override
    public void sendHtmlMail(String to, String subject, String templateName, Map<String, Object> variables) {
        if (to == null || to.isBlank()) {
            log.warn("Bỏ qua gửi email: Địa chỉ người nhận trống (subject: '{}')", subject);
            return;
        }

        try {
            Context context = new Context();
            if (variables != null) {
                context.setVariables(variables);
            }
            String htmlContent = templateEngine.process("email/" + templateName, context);

            if (!mailEnabled) {
                log.info("[MOCK EMAIL - DISABLED] Tới: {} | Tiêu đề: {} | Template: {}", to, subject, templateName);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("-> [EMAIL SENT] Đã gửi thư '{}' thành công tới {}", subject, to);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email tới {} (Subject: '{}'): {}", to, subject, e.getMessage());
        }
    }

    @Async("emailTaskExecutor")
    @Override
    public void sendMailWithPdfAttachment(String to, String subject, String templateName, 
                                          Map<String, Object> variables, String attachmentFilename, byte[] pdfBytes) {
        if (to == null || to.isBlank()) {
            log.warn("Bỏ qua gửi email kèm file: Địa chỉ người nhận trống (subject: '{}')", subject);
            return;
        }

        try {
            Context context = new Context();
            if (variables != null) {
                context.setVariables(variables);
            }
            String htmlContent = templateEngine.process("email/" + templateName, context);

            if (!mailEnabled) {
                log.info("[MOCK EMAIL WITH PDF - DISABLED] Tới: {} | File: {} ({} bytes)", to, attachmentFilename, pdfBytes != null ? pdfBytes.length : 0);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            if (pdfBytes != null && pdfBytes.length > 0) {
                String filename = (attachmentFilename != null && !attachmentFilename.isBlank()) ? attachmentFilename : "don-thuoc.pdf";
                helper.addAttachment(filename, new ByteArrayResource(pdfBytes), "application/pdf");
            }

            mailSender.send(message);
            log.info("-> [EMAIL SENT] Đã gửi thư kèm PDF '{}' thành công tới {}", attachmentFilename, to);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email kèm PDF tới {} (Subject: '{}'): {}", to, subject, e.getMessage());
        }
    }
}

