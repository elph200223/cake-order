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

export function buildCustomerFlex(r: ReservationData) {
  const people = r.children > 0 ? `${r.adults} 大人 / ${r.children} 小孩` : `${r.adults} 大人`;

  const infoRows: { label: string; value: string }[] = [
    { label: "姓名", value: r.customerName },
    { label: "日期", value: r.requestDate },
    { label: "時間", value: r.requestTime },
    { label: "人數", value: people },
    ...(r.note ? [{ label: "備註", value: r.note }] : []),
  ];

  return {
    type: "flex",
    altText: "請確認您的訂位資訊",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "請確認您的訂位資訊",
            weight: "bold",
            size: "lg",
            color: "#333333",
          },
          { type: "separator" },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: infoRows.map(({ label, value }) => ({
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: label, size: "sm", color: "#888888", flex: 2 },
                { type: "text", text: value, size: "sm", color: "#333333", flex: 5, wrap: true },
              ],
            })),
          },
          {
            type: "text",
            text: "確認無誤後請點下方按鈕送出申請。",
            size: "xs",
            color: "#aaaaaa",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            action: {
              type: "message",
              label: "確認訂位資訊無誤 ✓",
              text: `【訂位確認】#${r.id} 資訊無誤，送出申請`,
            },
          },
        ],
      },
    },
  };
}

export function buildReviewingFlex() {
  return {
    type: "flex",
    altText: "訂位申請已送出",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "訂位審核中",
            weight: "bold",
            size: "lg",
            color: "#F5A623",
          },
          { type: "separator" },
          {
            type: "text",
            text: "我們已收到您的訂位申請，將盡快確認並回覆您，感謝您的耐心等候 🙏",
            wrap: true,
            size: "sm",
            color: "#555555",
          },
        ],
      },
    },
  };
}

export function buildSuccessFlex(r: ReservationData, successText: string) {
  return {
    type: "flex",
    altText: "訂位成功",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "訂位成功",
            weight: "bold",
            size: "xl",
            color: "#1DB446"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "text",
            text: successText,
            wrap: true
          }
        ]
      }
    }
  };
}

export function buildRejectFlex(rejectText: string) {
  return {
    type: "flex",
    altText: "訂位未能成立",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "訂位未能成立",
            weight: "bold",
            size: "xl",
            color: "#E53E3E"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "text",
            text: rejectText,
            wrap: true
          }
        ]
      }
    }
  };
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
