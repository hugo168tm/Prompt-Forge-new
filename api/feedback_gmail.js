// feedback_gmail.js: 直接升級現有 API 端點使用 Resend
// 保持與現有 Flutter 代碼完全相容，只替換郵件發送功能

import { Resend } from 'resend';

// 初始化 Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 處理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, message, email, deviceInfo, appVersion, osVersion, language, timestamp, id, attachments } = req.body;

    // 驗證必填欄位
    if (!message || message.trim().length < 10) {
      return res.status(400).json({
        error: '請填寫所有必填欄位，且反饋內容至少 10 個字'
      });
    }

    // 獲取當前時間（香港時區）
    const now = new Date();
    const timestampHongKong = now.toLocaleString('zh-TW', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 構建郵件內容
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">PromptForge Flutter App</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">用戶反饋報告</p>
        </div>
        
        <div style="background: white; padding: 30px 20px;">
          <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 18px;">📝 反饋詳情</h2>
            <p style="margin: 5px 0; color: #155724;"><strong>反饋類型：</strong> ${type}</p>
            <p style="margin: 5px 0; color: #155724;"><strong>提交時間：</strong> ${timestampHongKong}</p>
            <p style="margin: 5px 0; color: #155724;"><strong>反饋ID：</strong> ${id}</p>
            ${email ? `<p style="margin: 5px 0; color: #155724;"><strong>聯絡信箱：</strong> ${email}</p>` : ''}
          </div>
          
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">💬 反饋內容</h3>
            <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">
              <p style="margin: 0; line-height: 1.6; color: #212529; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px;">📱 系統資訊</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">App版本</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd; color: #555;">${appVersion || '未知'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">裝置資訊</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd; color: #555;">${deviceInfo || '未知'}</td>
              </tr>
              <tr style="background: #f5f5f5;">
                <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">作業系統</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd; color: #555;">${osVersion || '未知'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; color: #333;">語言設定</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd; color: #555;">${language || '未知'}</td>
              </tr>
            </table>
          </div>
          
          ${attachments && attachments.length > 0 ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">📎 附件清單</h3>
              ${attachments.map(att => {
                const sizeMB = att.fileSize ? (att.fileSize / 1024 / 1024).toFixed(2) : '未知';
                return `
                  <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin-bottom: 8px;">
                    <p style="margin: 0; color: #856404;"><strong>📁 ${att.fileName}</strong></p>
                    <p style="margin: 2px 0 0 0; font-size: 14px; color: #856404;">大小: ${sizeMB} MB</p>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
        
        <div style="background: #6c757d; padding: 20px; text-align: center;">
          <p style="color: white; margin: 0; font-size: 12px;">此郵件由 PromptForge Flutter App 自動發送</p>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 11px;">發送時間: ${timestampHongKong} (UTC+8)</p>
        </div>
      </div>
    `;

    // 使用 Resend 發送郵件
    const { data, error } = await resend.emails.send({
      from: 'PromptForge Feedback <feedback@yourdomain.com>',
      to: ['hugo168tm86@gmail.com'],
      subject: `Flutter App 反饋 - ${type} [ID: ${id}]`,
      html: emailContent,
      tags: [
        { name: 'source', value: 'flutter_app_feedback' },
        { name: 'feedback_type', value: type },
        { name: 'device', value: deviceInfo || 'unknown' },
        { name: 'user_email', value: email || 'anonymous' }
      ]
    });

    if (error) {
      console.error('Resend API 錯誤:', error);
      return res.status(500).json({
        error: '郵件發送失敗，請稍後再試',
        details: error.message
      });
    }

    // 返回成功響應（與現有 API 格式一致）
    return res.status(200).json({
      success: true,
      id: data.id,
      message: '反饋已成功提交！我們會盡快回覆您。'
    });

  } catch (error) {
    console.error('伺服器錯誤:', error);
    return res.status(500).json({
      error: '伺服器內部錯誤，請稍後再試',
      details: error.message
    });
  }
}
