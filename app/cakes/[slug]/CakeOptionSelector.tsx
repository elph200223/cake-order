"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogOptionGroup } from "@/lib/catalog";
import { addCartItem } from "@/lib/cart";

type Props = {
  productId: number;
  productName: string;
  basePrice: number;
  optionGroups: CatalogOptionGroup[];
};

type SelectedState = Record<number, number[]>;

type DraftCartOptionItem = {
  optionGroupId: number;
  optionGroupName: string;
  optionId: number;
  optionName: string;
  priceDelta: number;
};

type DraftCartItem = {
  productId: number;
  productName: string;
  basePrice: number;
  quantity: number;
  options: DraftCartOptionItem[];
  subtotal: number;
};

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function formatDelta(price: number) {
  if (price === 0) return "不加價";
  const sign = price > 0 ? "+" : "-";
  return `${sign}NT$ ${Math.abs(price).toLocaleString("zh-TW")}`;
}

function getGroupRuleText(group: {
  required: boolean;
  minSelect: number;
  maxSelect: number;
}) {
  if (group.required) {
    if (group.minSelect === group.maxSelect) {
      return `必選｜選擇 ${group.minSelect} 項`;
    }
    return `必選｜${group.minSelect} ~ ${group.maxSelect} 項`;
  }

  return `可選｜最多 ${group.maxSelect} 項`;
}

function buildInitialSelected(optionGroups: CatalogOptionGroup[]): SelectedState {
  const initial: SelectedState = {};

  for (const group of optionGroups) {
    initial[group.id] = [];
  }

  return initial;
}

function isSingleChoice(group: CatalogOptionGroup) {
  return group.maxSelect <= 1;
}

function validateGroup(group: CatalogOptionGroup, selectedIds: number[]) {
  const count = selectedIds.length;

  if (group.required && count < group.minSelect) {
    if (group.minSelect === group.maxSelect) {
      return `請選擇 ${group.minSelect} 項`;
    }
    return `至少需選擇 ${group.minSelect} 項`;
  }

  if (count > group.maxSelect) {
    return `最多只能選擇 ${group.maxSelect} 項`;
  }

  return null;
}

function getGroupStatus(
  group: CatalogOptionGroup,
  selectedIds: number[],
  error: string | null
): {
  tone: "neutral" | "error" | "success";
  text: string;
} {
  const count = selectedIds.length;

  if (error) {
    return {
      tone: "error",
      text: error,
    };
  }

  if (count === 0) {
    return {
      tone: "neutral",
      text: group.required ? "尚未完成選擇" : "尚未選擇",
    };
  }

  return {
    tone: "success",
    text: "此群組選擇條件已符合",
  };
}

export default function CakeOptionSelector({
  productId,
  productName,
  basePrice,
  optionGroups,
}: Props) {
  const [selected, setSelected] = useState<SelectedState>(() =>
    buildInitialSelected(optionGroups)
  );
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitTone, setSubmitTone] = useState<"success" | "error" | "">("");

  const totalPrice = useMemo(() => {
    let total = basePrice;

    for (const group of optionGroups) {
      const selectedIds = selected[group.id] ?? [];
      for (const option of group.options) {
        if (selectedIds.includes(option.id)) {
          total += option.priceDelta;
        }
      }
    }

    return total;
  }, [basePrice, optionGroups, selected]);

  const groupErrors = useMemo(() => {
    const result: Record<number, string | null> = {};

    for (const group of optionGroups) {
      result[group.id] = validateGroup(group, selected[group.id] ?? []);
    }

    return result;
  }, [optionGroups, selected]);

  const isFormValid = useMemo(() => {
    return optionGroups.every((group) => !groupErrors[group.id]);
  }, [groupErrors, optionGroups]);

  const draftCartItem = useMemo<DraftCartItem>(() => {
    const options: DraftCartOptionItem[] = [];

    for (const group of optionGroups) {
      const selectedIds = selected[group.id] ?? [];

      for (const option of group.options) {
        if (!selectedIds.includes(option.id)) continue;

        options.push({
          optionGroupId: group.id,
          optionGroupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        });
      }
    }

    return {
      productId,
      productName,
      basePrice,
      quantity: 1,
      options,
      subtotal: totalPrice,
    };
  }, [basePrice, optionGroups, productId, productName, selected, totalPrice]);

  function isChecked(groupId: number, optionId: number) {
    return (selected[groupId] ?? []).includes(optionId);
  }

  function toggleSingle(group: CatalogOptionGroup, optionId: number) {
    setSubmitMessage("");
    setSubmitTone("");

    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const alreadyChecked = current.includes(optionId);

      if (!group.required && alreadyChecked) {
        return {
          ...prev,
          [group.id]: [],
        };
      }

      return {
        ...prev,
        [group.id]: [optionId],
      };
    });
  }

  function toggleMulti(group: CatalogOptionGroup, optionId: number) {
    setSubmitMessage("");
    setSubmitTone("");

    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(optionId);

      if (exists) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== optionId),
        };
      }

      if (current.length >= group.maxSelect) {
        return prev;
      }

      return {
        ...prev,
        [group.id]: [...current, optionId],
      };
    });
  }

  function handleAddToCart() {
    setSubmitMessage("");
    setSubmitTone("");

    if (!isFormValid) {
      setSubmitTone("error");
      setSubmitMessage("請先完成必選規格，再加入購物車。");
      return;
    }

    try {
      addCartItem(draftCartItem);
      setSubmitTone("success");
      setSubmitMessage("已加入購物車，現在可前往結帳頁查看。");
    } catch {
      setSubmitTone("error");
      setSubmitMessage("加入購物車失敗。");
    }
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">目前選擇總價</h2>
            <p className="mt-1 text-sm text-neutral-500">已含規格與加購加價</p>
          </div>
          <div className="text-xl font-bold text-neutral-950">
            {formatMoney(totalPrice)}
          </div>
        </div>
      </div>

      {optionGroups.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          此商品目前沒有可選規格或加購項目。
        </div>
      ) : (
        optionGroups.map((group) => {
          const selectedIds = selected[group.id] ?? [];
          const checkedCount = selectedIds.length;
          const error = groupErrors[group.id];
          const status = getGroupStatus(group, selectedIds, error);

          return (
            <section
              key={group.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {group.name}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {getGroupRuleText(group)}
                  </p>
                </div>

                <div className="text-xs text-neutral-500">
                  已選 {checkedCount} / 最多 {group.maxSelect}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {group.options.length === 0 ? (
                  <p className="text-sm text-neutral-400">此群組目前沒有可用選項</p>
                ) : (
                  group.options.map((option) => {
                    const checked = isChecked(group.id, option.id);
                    const inputType = isSingleChoice(group) ? "radio" : "checkbox";
                    const disabled =
                      !checked &&
                      !isSingleChoice(group) &&
                      selectedIds.length >= group.maxSelect;

                    return (
                      <label
                        key={option.id}
                        className={[
                          "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition",
                          checked
                            ? "border-neutral-900 bg-neutral-100"
                            : "border-neutral-200 bg-white hover:bg-neutral-50",
                          disabled ? "cursor-not-allowed opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type={inputType}
                            name={`group-${group.id}`}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => {
                              if (isSingleChoice(group)) {
                                toggleSingle(group, option.id);
                              } else {
                                toggleMulti(group, option.id);
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900">
                              {option.name}
                            </p>
                          </div>
                        </div>

                        <div className="ml-4 shrink-0 text-sm font-medium text-neutral-700">
                          {formatDelta(option.priceDelta)}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <p
                className={[
                  "mt-3 text-sm font-medium",
                  status.tone === "error"
                    ? "text-red-600"
                    : status.tone === "success"
                      ? "text-green-700"
                      : "text-neutral-500",
                ].join(" ")}
              >
                {status.text}
              </p>
            </section>
          );
        })
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">下一步</h3>
            <p className="mt-1 text-sm text-neutral-500">
              加入購物車後，可直接前往結帳頁查看已選商品。
            </p>
          </div>
          <Link
            href="/checkout"
            className="inline-flex items-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            前往結帳頁
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isFormValid}
        >
          加入購物車
        </button>

        {submitMessage ? (
          <p
            className={[
              "mt-3 text-sm font-medium",
              submitTone === "error" ? "text-red-600" : "text-green-700",
            ].join(" ")}
          >
            {submitMessage}
          </p>
        ) : !isFormValid ? (
          <p className="mt-3 text-sm text-red-600">
            請先完成必選規格，才能加入購物車。
          </p>
        ) : (
          <p className="mt-3 text-sm text-green-700">
            規格資料已可加入購物車。
          </p>
        )}
      </div>
    </section>
  );
}