export interface EscapeHatchInput {
  availableForUser: number // โจทย์ที่ user ยังไม่เจอใน sub-pool (หลัง lock filter)
  todayCount: number       // จำนวน real-time gen ที่ fire ไปแล้ววันนี้ (per sub-pool)
  dailyCap: number         // เพดานกัน cost ระเบิด
}

// fire เฉพาะตอน pool จะว่างจริงสำหรับ user + ยังไม่ชน cap (§4.2 C3)
export function shouldTriggerEscapeHatch(i: EscapeHatchInput): boolean {
  return i.availableForUser === 0 && i.todayCount < i.dailyCap
}
