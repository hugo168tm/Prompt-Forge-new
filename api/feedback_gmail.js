// feedback_gmail.js: 使用 Resend API 發送反饋郵件
// 升級版：支援新的Flutter客戶端數據格式和圖片附件預覽

import { Resend } from 'resend';

// Resend API配置
const resend = new Resend(process.env.RESEND_API_KEY || 're_6VAsdub1_BknYcscA8cRKsitYktySKgeg');
const TARGET_EMAIL = 'hugo168tm86@gmail.com';

// 格式化檔案大小顯示
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 格式化香港時間顯示
function formatHongKongTime(timestamp) {
  try {
    // 如果傳入的是ISO字符串，先解析為Date對象
    const date = new Date(timestamp);
    
    // 檢查是否為有效的日期
    if (isNaN(date.getTime())) {
      console.error('無效的時間戳:', timestamp);
      return new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' }) + ' (香港時間)';
    }
    
    // 正確的香港時間格式化
    const options = {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const hongKongTime = date.toLocaleString('zh-TW', options);
    console.log(`時間轉換: ${timestamp} -> ${hongKongTime}`);
    return hongKongTime;
  } catch (e) {
    console.error('時間格式化錯誤:', e);
    // 降級處理：使用當前時間
    return new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' });
  }
}

// 創建郵件內容 - 支援新的Flutter客戶端數據格式
function createEmailContent({ 
  type,           // 繁體中文顯示名稱 (新)
  typeValue,      // 原始英文值 (新)
  message, 
  email, 
  deviceInfo, 
  appVersion, 
  osVersion, 
  language, 
  timestamp, 
  id,
  attachments = [] // 附件信息 (新)
}) {
  const displayType = type || typeValue || '其他'; // 優先使用中文顯示名稱
  const subject = `App 反饋 - ${displayType} [ID: ${id}]`;
  
  // 生成附件HTML部分
  let attachmentsHtml = '';
  let attachmentsText = '';
  
  if (attachments && attachments.length > 0) {
    attachmentsHtml = `
      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin-top: 0;">📎 附件清單 (${attachments.length}個檔案)</h3>
        <div style="margin-top: 15px;">
    `;
    
    attachmentsText = '\n📎 附件清單：\n';
    
    attachments.forEach((attachment, index) => {
      const fileName = attachment.fileName || `附件_${index + 1}`;
      const fileSize = attachment.fileSize || 0;
      const mimeType = attachment.mimeType || '未知類型';
      const formattedSize = formatFileSize(fileSize);
      
      // 格式化檔案大小
      const sizeText = formattedSize ? `(${formattedSize})` : '';
      
      attachmentsText += `  ${index + 1}. ${fileName} ${sizeText}\n`;
      
      if (attachment.fileData && mimeType.startsWith('image/')) {
        // 圖片附件：顯示base64預覽
        // 確保fileData是完整的data URI格式
        let imageSrc = attachment.fileData;
        if (!imageSrc.startsWith('data:')) {
          // 如果沒有data:前綴，添加它
          imageSrc = `data:${mimeType};base64,${imageSrc}`;
        }
        
        attachmentsHtml += `
          <div style="display: inline-block; margin: 10px; text-align: center; vertical-align: top;">
            <div style="position: relative; display: inline-block;">
              <img
                src="${imageSrc}"
                alt="${fileName}"
                style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e9ecef; display: block;"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
              >
              <div style="display: none; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                <div style="color: #6c757d; font-size: 24px;">📷</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">圖片預覽載入失敗</div>
              </div>
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 5px; word-break: break-all;">
              ${sizeText}
            </div>
          </div>
        `;
      } else {
        // 非圖片附件：顯示檔案圖示和資訊
        attachmentsHtml += `
          <div style="display: inline-block; margin: 10px; text-align: center; vertical-align: top; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; min-width: 120px;">
            <div style="color: #6c757d; font-size: 24px; margin-bottom: 8px;">📄</div>
            <div style="font-size: 12px; color: #666; word-break: break-all;">
              ${fileName}<br>${sizeText}
            </div>
          </div>
        `;
      }
    });
    
    attachmentsHtml += `
        </div>
      </div>
    `;
  } else if (attachments && attachments.length > 0) {
    // 如果有附件但沒有生成HTML（可能是數據問題），生成一個簡單列表
    attachmentsHtml = `
      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin-top: 0;">📎 附件清單 (${attachments.length}個檔案)</h3>
        <div style="margin-top: 15px;">
          <p style="color: #666;">無法預覽附件，請查看下方文字列表。</p>
        </div>
      </div>
    `;
  }
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; text-align: center;">🚀 App 反饋通知</h1>
        <p style="color: white; margin: 10px 0 0 0; text-align: center; font-size: 14px;">新版本：支援圖片附件預覽功能</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">📋 反饋詳情</h2>
        <p><strong>🔖 反饋類型：</strong> ${displayType}</p>
        <p><strong>🆔 反饋ID：</strong> ${id}</p>
        <p><strong>🕐 提交時間：</strong> ${formatHongKongTime(timestamp)}</p>
        <p><strong>📧 聯絡信箱：</strong> ${email || '匿名'}</p>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin-top: 0;">💬 反饋內容</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; border-left: 4px solid #007bff;">${message}</div>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin-top: 0;">📱 系統資訊</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>📲 App版本：</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${appVersion}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>🔧 裝置資訊：</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${deviceInfo}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>💻 作業系統：</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${osVersion}</td></tr>
          <tr><td style="padding: 8px;"><strong>🌐 語言設定：</strong></td><td style="padding: 8px;">${language}</td></tr>
        </table>
      </div>

      ${attachmentsHtml}

      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <p style="color: #666; margin: 0;">📩 此郵件來自 Prompt Optimizer App 反饋系統</p>
        <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">✨ 請及時處理使用者反饋以提升產品體驗</p>
      </div>
    </div>
  `;

  const textContent = `
App 反饋通知
===========

📋 反饋詳情：
- 🔖 反饋類型：${displayType}
- 🆔 反饋ID：${id}
- 🕐 提交時間：${formatHongKongTime(timestamp)}
- 📧 聯絡信箱：${email || '匿名'}

💬 反饋內容：
${message}

📱 系統資訊：
- 📲 App版本：${appVersion}
- 🔧 裝置資訊：${deviceInfo}
- 💻 作業系統：${osVersion}
- 🌐 語言設定：${language}

${attachmentsText}
📩 此郵件來自 Prompt Optimizer App 反饋系統
  `;

  return { subject, htmlContent, textContent };
}

// 發送 Resend 郵件
async function sendResendEmail(emailData) {
  try {
    const { subject, htmlContent, textContent } = emailData;
    
    const response = await resend.emails.send({
      from: 'Prompt Forge <noreply@resend.dev>',
      to: [TARGET_EMAIL],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    
    return {
      success: true,
      id: response.data?.id,
    };
    
  } catch (error) {
    console.error('Resend發送錯誤:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 主處理函數 - 升級版
export default async function handler(req, res) {
  // 設置CORS頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 處理OPTIONS預檢請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只接受POST請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 解析請求數據 - 支援新的Flutter數據格式
    const { 
      type,           // 繁體中文顯示名稱 (新)
      typeValue,      // 原始英文值 (備用)
      message, 
      email, 
      attachments = [], // 附件信息 (新)
      deviceInfo, 
      appVersion, 
      osVersion,
      language,
      timestamp,
      id 
    } = req.body;

    // 基本驗證
    if (!type && !typeValue || !message || !id) {
      return res.status(400).json({ 
        error: '缺少必要的反饋資料',
        required: ['type/typeValue', 'message', 'id'] 
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ 
        error: '反饋內容至少需要10個字元' 
      });
    }

    // 驗證附件數據格式 (新)
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.fileName && attachment.fileSize !== undefined) {
          processedAttachments.push({
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType || 'application/octet-stream',
            fileData: attachment.fileData // base64數據 (圖片附件)
          });
        }
      }
    }

    // 創建郵件內容
    const emailContent = createEmailContent({
      type,
      typeValue,
      message,
      email,
      deviceInfo,
      appVersion,
      osVersion,
      language,
      timestamp,
      id,
      attachments: processedAttachments // 處理後的附件數據
    });

    // 嘗試發送 Resend 郵件
    const resendResult = await sendResendEmail({
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent
    });

    if (resendResult.success) {
      // Resend發送成功
      console.log('✅ Resend郵件發送成功:', resendResult.id);
      console.log(`📎 附件數量: ${processedAttachments.length}`);
      
      return res.status(200).json({
        success: true,
        message: '反饋已成功提交並發送至郵箱',
        trackingId: id,
        resendMessageId: resendResult.id,
        sent: true,
        attachmentsCount: processedAttachments.length,
        supportsImagePreview: true,
        service: 'Resend'
      });
    } else {
      // Resend發送失敗，嘗試備用方案
      console.log('❌ Resend發送失敗，嘗試備用方案:', resendResult.error);
      
      // 記錄到日誌
      console.log('=== 備用反饋記錄 ===');
      console.log('收件人:', TARGET_EMAIL);
      console.log('主旨:', emailContent.subject);
      console.log('內容:', emailContent.textContent);
      console.log(`附件數量: ${processedAttachments.length}`);
      console.log('====================');
      
      return res.status(200).json({
        success: true,
        message: '反饋已記錄，日誌已保存（郵件發送服務暫時不可用）',
        trackingId: id,
        sent: false,
        error: resendResult.error,
        attachmentsCount: processedAttachments.length,
        supportsImagePreview: processedAttachments.length > 0,
        service: 'Resend'
      });
    }

  } catch (error) {
    console.error('反饋API錯誤:', error);
    return res.status(500).json({ 
      error: '服務器內部錯誤',
      message: error.message 
    });
  }
}

// 為支援附件上傳，添加multipart處理
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // 支援較大的附件數據
    },
  },
}
