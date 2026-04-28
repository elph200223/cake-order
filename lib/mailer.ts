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
  const customerName = args.customer.trim() || "顧客";

  const text = [
    `${customerName} 您好：`,
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

  const itemRows = args.items.length
    ? args.items.map((item) =>
        `<tr>
          <td style="padding:4px 0;color:#555555;">・${escapeHtml(item.name)}</td>
          <td style="padding:4px 0;color:#555555;text-align:right;white-space:nowrap;">× ${item.quantity}</td>
        </tr>`
      ).join("")
    : `<tr><td colspan="2" style="color:#999999;">（無品項資料）</td></tr>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">我們已收到您的付款，這筆訂單已成立。</p>
    <table cellpadding="0" cellspacing="0" style="background:#f9f6f2;border-radius:4px;padding:14px 18px;font-size:13px;line-height:2;color:#555555;width:100%;">
      <tr>
        <td style="white-space:nowrap;"><strong style="color:#333;">訂單編號</strong></td>
        <td style="padding-left:16px;">${escapeHtml(args.orderNo)}</td>
      </tr>
      <tr>
        <td style="white-space:nowrap;"><strong style="color:#333;">取貨時間</strong></td>
        <td style="padding-left:16px;">${escapeHtml(pickupText)}</td>
      </tr>
      <tr>
        <td style="white-space:nowrap;"><strong style="color:#333;">訂單金額</strong></td>
        <td style="padding-left:16px;">${escapeHtml(formatCurrency(args.totalAmount))}</td>
      </tr>
    </table>
    <p style="margin:16px 0 8px;font-size:13px;font-weight:700;color:#333333;">訂單內容</p>
    <table cellpadding="0" cellspacing="0" style="background:#f9f6f2;border-radius:4px;padding:14px 18px;font-size:13px;width:100%;">
      ${itemRows}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#666666;">如需調整訂單內容，請盡快直接回覆此信與我們聯繫。</p>`;

  const html = buildCardHtml({
    accentColor: "#8B5E3C",
    title: "訂單付款成功",
    customerName,
    bodyHtml,
    uniqueId: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
  uniqueId: string;
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
  <!-- ${opts.uniqueId} -->
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
    uniqueId: `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    uniqueId: `reject-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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