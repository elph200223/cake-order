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