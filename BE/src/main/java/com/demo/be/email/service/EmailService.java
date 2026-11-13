package com.demo.be.email.service;

import java.util.Map;

public interface EmailService {

    /**
     * Gửi email định dạng HTML sử dụng Thymeleaf template
     */
    void sendHtmlMail(String to, String subject, String templateName, Map<String, Object> variables);

    /**
     * Gửi email định dạng HTML kèm file đính kèm PDF (ví dụ Đơn thuốc / Phiếu khám)
     */
    void sendMailWithPdfAttachment(String to, String subject, String templateName, 
                                  Map<String, Object> variables, String attachmentFilename, byte[] pdfBytes);
}

