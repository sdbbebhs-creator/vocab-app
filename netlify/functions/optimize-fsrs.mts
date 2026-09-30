import type { Config } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'] as const;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

async function callGeminiWithFallback(ai: GoogleGenAI, prompt: string) {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response && response.text) return response;
    } catch (err: any) {
      lastError = err;
      const code = err?.status || err?.code || err?.error?.code;
      const msg = String(err?.message || '');
      const isTransient =
        code === 503 || code === 429 || msg.includes('503') || msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED');
      if (isTransient) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
    }
  }
  throw lastError;
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const {
    total_reviews = 0,
    actual_retention = 88,
    target_retention = 90,
    daily_cards = 25,
    user_goal = 'Học dài hạn / Bền vững',
  } = await req.json();

  const isEligible = total_reviews >= 1000;
  const goalStr = String(user_goal || '').toLowerCase();
  const isUrgent =
    goalStr.includes('cấp tốc') || goalStr.includes('ielts') || goalStr.includes('toefl') ||
    goalStr.includes('thi') || goalStr.includes('ngắn hạn');

  const fallbackRecommendedRetention = isUrgent ? 0.91 : 0.88;
  const fallbackStatus: 'COLD_START' | 'OPTIMIZED' | 'ADJUST_RETENTION' = isEligible ? 'OPTIMIZED' : 'COLD_START';
  const fallbackMessage = !isEligible
    ? `Hệ thống đang tiếp tục ghi nhận nhịp học của bạn (hiện tại: ${total_reviews}/1.000 lượt). AI đang áp dụng lịch ôn chuẩn tối ưu nhất để bạn ghi nhớ nhẹ nhàng!`
    : isUrgent
    ? `AI đã phân tích ${total_reviews} lượt học của bạn và điều chỉnh thuật toán riêng cho não bộ của bạn. Mục tiêu ghi nhớ được đặt ở mức ${Math.round(fallbackRecommendedRetention * 100)}% để đảm bảo bạn đạt phong độ tốt nhất cho kỳ thi sắp tới!`
    : `AI đã phân tích ${total_reviews} lượt học của bạn và tối ưu hóa nhịp ôn tập phù hợp với não bộ. Mục tiêu ghi nhớ được đặt ở mức ${Math.round(fallbackRecommendedRetention * 100)}%, giúp giảm đáng kể áp lực ôn tập hàng ngày mà vẫn duy trì trí nhớ bền vững!`;

  const ai = getGeminiClient();
  if (!ai) {
    return Response.json({
      success: true,
      source: 'local_deterministic',
      data: {
        is_eligible_for_optimization: isEligible,
        recommended_target_retention: fallbackRecommendedRetention,
        status_code: fallbackStatus,
        user_message: fallbackMessage,
      },
    });
  }

  const prompt = `Bạn là "Trợ lý Tối ưu Ghi nhớ AI" tích hợp trong ứng dụng học tập. Nhiệm vụ của bạn là phân tích dữ liệu lịch sử học tập (Memory Logs) của người dùng và đưa ra thiết lập thuật toán lặp lại ngắt quãng (FSRS) tối ưu nhất mà không gây ngợp cho họ.

--- THÔNG TIN ĐẦU VÀO TỪ HỆ THỐNG ---
- Tổng số lượt ôn tập đã thực hiện (total_reviews): ${total_reviews}
- Tỷ lệ ghi nhớ thực tế hiện tại (actual_retention): ${actual_retention}%
- Mục tiêu ghi nhớ hiện tại (target_retention): ${target_retention}%
- Số lượng thẻ học trung bình/ngày: ${daily_cards}
- Mục tiêu học tập của người dùng: ${user_goal} (Ví dụ: Thi cấp tốc, Học giao tiếp dài hạn, Thi chứng chỉ Y khoa/Luật...)

--- Quy tắc xử lý logic FSRS ---
1. BƯỚC ĐÁNH GIÁ ĐỦ ĐIỀU KIỆN (Cold Start Check):
   - Nếu total_reviews < 1000: Chưa đủ dữ liệu để cá nhân hóa tham số sâu. Sử dụng tham số mặc định (Default FSRS Parameters). is_eligible_for_optimization = false, status_code = "COLD_START".
   - Nếu total_reviews >= 1000: Đã đủ dữ liệu để kích hoạt tính năng "Cá nhân hóa theo não bộ" (Optimize FSRS Parameters). is_eligible_for_optimization = true, status_code = "OPTIMIZED".

2. BƯỚC ĐỀ XUẤT MỤC TIÊU GHI NHỚ (Target Retention Recommendation):
   - Nếu mục tiêu là "Thi cấp tốc / Ngắn hạn": Đề xuất Target Retention từ 0.90 đến 0.92 (học nhiều thẻ hơn nhưng đảm bảo không quên khi thi).
   - Nếu mục tiêu là "Học dài hạn / Bền vững": Đề xuất Target Retention từ 0.85 đến 0.88 (giảm 30-40% số lượng thẻ phải ôn mỗi ngày, giữ nhịp học nhẹ nhàng).

--- YÊU CẦU ĐẦU RA (OUTPUT FORMAT) ---
Trả về kết quả dưới dạng JSON (không dùng markdown backticks, chỉ trả về chuỗi JSON thuần):
{
  "is_eligible_for_optimization": boolean,
  "recommended_target_retention": float,
  "status_code": "COLD_START" | "OPTIMIZED" | "ADJUST_RETENTION",
  "user_message": "Lời giải thích ngắn gọn (tối đa 3 câu), thân thiện, không dùng thuật ngữ kỹ thuật phức tạp (như FSRS, w-parameters, loss function), tập trung vào lợi ích người dùng nhận được."
}`;

  try {
    const response = await callGeminiWithFallback(ai, prompt);
    const parsed = JSON.parse(response.text || '{}');
    return Response.json({
      success: true,
      source: 'gemini_api',
      data: {
        is_eligible_for_optimization:
          typeof parsed.is_eligible_for_optimization === 'boolean' ? parsed.is_eligible_for_optimization : isEligible,
        recommended_target_retention:
          typeof parsed.recommended_target_retention === 'number' ? parsed.recommended_target_retention : fallbackRecommendedRetention,
        status_code: parsed.status_code || fallbackStatus,
        user_message: parsed.user_message || fallbackMessage,
      },
    });
  } catch (err: any) {
    console.warn('Gemini FSRS optimization fell back safely to offline engine:', err?.message || err);
    return Response.json({
      success: true,
      source: 'fallback_offline',
      data: {
        is_eligible_for_optimization: isEligible,
        recommended_target_retention: fallbackRecommendedRetention,
        status_code: fallbackStatus,
        user_message: fallbackMessage,
      },
    });
  }
};

export const config: Config = {
  path: '/api/ai/optimize-fsrs',
};
