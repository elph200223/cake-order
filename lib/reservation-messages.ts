type ReservationData = {
  id: number;
  customerName: string;
  phone: string;
  adults: number;
  children: number;
  requestDate: string;
  requestTime: string;
  note: string;
};

export function buildCustomerMessage(r: ReservationData): string {
  const people =
    r.children > 0 ? `${r.adults} 大人 / ${r.children} 小孩` : `${r.adults} 大人`;
  return (
    `您好 ${r.customerName}！\n\n` +
    `已收到您的訂位申請：\n` +
    `📅 ${r.requestDate} ${r.requestTime}\n` +
    `👥 ${people}\n\n` +
    `我們會盡快確認並回覆您，感謝您的耐心等候 🙏`
  );
}

async function linePostWithToken(
  accessToken: string,
  path: string,
  body: unknown
): Promise<void> {
  const res = await fetch(`https://api.line.me/v2/bot/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${res.status}: ${text}`);
  }
}

export async function pushFlexToAdmin(
  reservation: ReservationData,
  accessToken: string,
  groupId: string
): Promise<void> {
  const people =
    reservation.children > 0
      ? `${reservation.adults} 大人 / ${reservation.children} 小孩`
      : `${reservation.adults} 大人`;

  const bodyContents = [
    { type: "text", text: "📋 新訂位申請", weight: "bold", size: "lg" },
    { type: "text", text: `姓名：${reservation.customerName}`, margin: "md" },
    { type: "text", text: `電話：${reservation.phone}` },
    { type: "text", text: `人數：${people}` },
    { type: "text", text: `時間：${reservation.requestDate} ${reservation.requestTime}` },
    ...(reservation.note
      ? [{ type: "text", text: `備註：${reservation.note}`, wrap: true, color: "#888888" }]
      : []),
  ];

  const flex = {
    type: "bubble",
    body: { type: "box", layout: "vertical", spacing: "sm", contents: bodyContents },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "postback",
            label: "✅ 確認訂位",
            data: `action=confirm&id=${reservation.id}`,
          },
        },
        {
          type: "button",
          style: "primary",
          color: "#E53E3E",
          action: {
            type: "postback",
            label: "❌ 拒絕訂位",
            data: `action=reject&id=${reservation.id}`,
          },
        },
      ],
    },
  };

  await linePostWithToken(accessToken, "message/push", {
    to: groupId,
    messages: [
      {
        type: "flex",
        altText: `新訂位申請：${reservation.customerName}`,
        contents: flex,
      },
    ],
  });
}
