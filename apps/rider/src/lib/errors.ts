const MESSAGES: [string, string][] = [
  ["SLOT_OVERLAP_OR_REST_VIOLATION", "عندك Slot آخر فهاد الوقت أو قريب منو. خاص 30 دقيقة راحة بين كل Slot."],
  ["SLOT_DATE_IN_PAST", "هاد النهار فات. اختار اليوم أو نهار من بعد."],
  ["SLOT_IN_PAST", "هاد النهار فات. اختار اليوم أو نهار من بعد."],
  ["INVALID_SLOT_TIME", "وقت النهاية خاصه يكون من بعد وقت البداية."],
  ["INVALID_SLOT_CAPACITY", "السعة خاصها تكون بين 1 و 20."],
  ["SLOT_FULL", "هاد الـSlot عامر. سجل فلائحة الانتظار."],
  ["SLOT_NOT_AVAILABLE", "هاد الـSlot ما بقاش متاح."],
  ["RIDER_NOT_APPROVED", "حسابك ما تفعّلش بعد. الإدارة خاصها توافق عليه."],
  ["ACTIVE_SLOT_REQUIRED", "باش تفعّل Online خاصك Slot محجوز كيغطي الوقت ديال دابا."],
];

// Turns backend error codes into a message the rider understands.
export function friendlyError(raw: string, fallback: string): string {
  for (const [code, text] of MESSAGES) if (raw.includes(code)) return text;
  return raw || fallback;
}
