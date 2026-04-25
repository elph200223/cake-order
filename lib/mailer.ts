import nodemailer from "nodemailer";

type PaidOrderEmailItem = {
  name: string;
  quantity: number;
};

type SendPaidOrderEmailArgs = {
  to: string;
  orderNo: string;
  customer: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  items: PaidOrderEmailItem[];
};

function getRequiredEnv(name: string) {
  const value = (process.env[name] || "").trim();

  if (!value) {
    throw new Error(`MISSING_ENV_${name}`);
  }

  return value;
}

function getSmtpConfig() {
  const user = getRequiredEnv("GMAIL_SMTP_USER");
  const rawPass = getRequiredEnv("GMAIL_SMTP_APP_PASSWORD");
  const normalizedPass = rawPass.replace(/\s+/g, "");
  const fromName = (process.env.GMAIL_FROM_NAME || "眷鳥咖啡").trim();

  return {
    user,
    rawPass,
    normalizedPass,
    fromName,
  };
}

function formatCurrency(amount: number) {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}

function buildItemsText(items: PaidOrderEmailItem[]) {
  if (!items.length) {
    return "（無品項資料）";
  }

  return items.map((item) => `• ${item.name} × ${item.quantity}`).join("\n");
}

function buildPickupText(pickupDate: string, pickupTime: string) {
  return [pickupDate.trim(), pickupTime.trim()].filter(Boolean).join(" ") || "未提供";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function maskEmail(value: string) {
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  return `${value.slice(0, 2)}***${value.slice(at)}`;
}

function createTransporter() {
  const smtp = getSmtpConfig();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtp.user,
      pass: smtp.normalizedPass,
    },
  });
}

export async function sendPaidOrderEmail(args: SendPaidOrderEmailArgs) {
  const smtp = getSmtpConfig();
  const to = args.to.trim();

  if (!to) {
    throw new Error("EMAIL_RECIPIENT_REQUIRED");
  }

  console.log("[mailer] smtp config", {
    userMasked: maskEmail(smtp.user),
    rawPassLength: smtp.rawPass.length,
    normalizedPassLength: smtp.normalizedPass.length,
    rawPassHasWhitespace: /\s/.test(smtp.rawPass),
    normalizedPassHasWhitespace: /\s/.test(smtp.normalizedPass),
    fromName: smtp.fromName,
    recipientMasked: maskEmail(to),
  });

  const transporter = createTransporter();

  const subject = `【眷鳥咖啡】訂單付款成功通知 ${args.orderNo}`;
  const pickupText = buildPickupText(args.pickupDate, args.pickupTime);
  const itemsText = buildItemsText(args.items);

  const text = [
    `${args.customer.trim() || "顧客"} 您好：`,
    "",
    "我們已收到您的付款，這筆訂單已成立。",
    "",
    `訂單編號：${args.orderNo}`,
    `取貨時間：${pickupText}`,
    `訂單金額：${formatCurrency(args.totalAmount)}`,
    "",
    "訂單內容：",
    itemsText,
    "",
    "如需調整訂單內容，請盡快直接回覆此信與我們聯繫。",
    "",
    "眷鳥咖啡 敬上",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, 'Noto Sans TC', sans-serif; line-height: 1.8; color: #222;">
      <p>${escapeHtml(args.customer.trim() || "顧客")} 您好：</p>
      <p>我們已收到您的付款，這筆訂單已成立。</p>
      <p>
        <strong>訂單編號：</strong>${escapeHtml(args.orderNo)}<br />
        <strong>取貨時間：</strong>${escapeHtml(pickupText)}<br />
        <strong>訂單金額：</strong>${escapeHtml(formatCurrency(args.totalAmount))}
      </p>
      <p><strong>訂單內容：</strong></p>
      <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapeHtml(itemsText)}</pre>
      <p>如需調整訂單內容，請盡快直接回覆此信與我們聯繫。</p>
      <p>眷鳥咖啡 敬上</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to,
    subject,
    text,
    html,
    replyTo: smtp.user,
  });
}

// ── 訂位通知 email ─────────────────────────────────────────────────────────────

type ReservationEmailArgs = {
  to: string;
  customerName: string;
  requestDate: string;
  requestTime: string;
  adults: number;
  children: number;
  note?: string;
};

function buildPeopleText(adults: number, children: number) {
  return children > 0 ? `${adults} 位大人 / ${children} 位小孩` : `${adults} 位大人`;
}

function nl2br(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function buildCardHtml(opts: {
  accentColor: string;
  title: string;
  customerName: string;
  bodyHtml: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3efea;font-family:Arial,'Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3efea;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- 色條 -->
        <tr><td style="background:${opts.accentColor};height:6px;"></td></tr>
        <!-- 標題 -->
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0;font-size:20px;font-weight:700;color:${opts.accentColor};">${escapeHtml(opts.title)}</p>
          <hr style="border:none;border-top:1px solid #eeeeee;margin:16px 0;" />
        </td></tr>
        <!-- 內文 -->
        <tr><td style="padding:0 32px 28px;font-size:14px;line-height:1.9;color:#333333;">
          <p style="margin:0 0 12px;">${escapeHtml(opts.customerName)} 您好：</p>
          ${opts.bodyHtml}
          <p style="margin:20px 0 0;color:#888888;font-size:13px;">眷鳥咖啡 敬上</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReservationConfirmEmail(args: ReservationEmailArgs & { confirmMessage: string }) {
  const smtp = getSmtpConfig();
  const to = args.to.trim();
  if (!to) throw new Error("EMAIL_RECIPIENT_REQUIRED");

  const transporter = createTransporter();
  const subject = "【眷鳥咖啡】您的訂位已確認";
  const peopleText = buildPeopleText(args.adults, args.children);

  const text = [
    `${args.customerName} 您好：`,
    "",
    args.confirmMessage,
    "",
    "訂位資訊：",
    `日期時間：${args.requestDate} ${args.requestTime}`,
    `人數：${peopleText}`,
    ...(args.note ? [`備註：${args.note}`] : []),
    "",
    "眷鳥咖啡 敬上",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 16px;">${nl2br(args.confirmMessage)}</p>
    <table cellpadding="0" cellspacing="0" style="background:#f9f6f2;border-radius:4px;padding:14px 18px;font-size:13px;line-height:2;color:#555555;width:100%;">
      <tr><td><strong style="color:#333;">日期時間</strong></td><td>${escapeHtml(args.requestDate)} ${escapeHtml(args.requestTime)}</td></tr>
      <tr><td><strong style="color:#333;">人數</strong></td><td>${escapeHtml(peopleText)}</td></tr>
      ${args.note ? `<tr><td><strong style="color:#333;">備註</strong></td><td>${escapeHtml(args.note)}</td></tr>` : ""}
    </table>`;

  const html = buildCardHtml({
    accentColor: "#1DB446",
    title: "訂位已確認",
    customerName: args.customerName,
    bodyHtml,
  });

  return transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to,
    subject,
    text,
    html,
    replyTo: smtp.user,
  });
}

export async function sendReservationRejectEmail(args: ReservationEmailArgs & { rejectMessage: string }) {
  const smtp = getSmtpConfig();
  const to = args.to.trim();
  if (!to) throw new Error("EMAIL_RECIPIENT_REQUIRED");

  const transporter = createTransporter();
  const subject = "【眷鳥咖啡】訂位申請通知";

  const text = [
    `${args.customerName} 您好：`,
    "",
    args.rejectMessage,
    "",
    "眷鳥咖啡 敬上",
  ].join("\n");

  const bodyHtml = `<p style="margin:0;">${nl2br(args.rejectMessage)}</p>`;

  const html = buildCardHtml({
    accentColor: "#E53E3E",
    title: "訂位未能成立",
    customerName: args.customerName,
    bodyHtml,
  });

  return transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to,
    subject,
    text,
    html,
    replyTo: smtp.user,
  });
}