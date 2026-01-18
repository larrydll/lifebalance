
import { GoogleGenAI, Type } from "@google/genai";
import { Dimension, ActionPlanItem } from "../types";

// Initialize client lazily to prevent app crash if API key is missing
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.warn("Gemini API Key is missing or invalid");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

export const generateActionPlan = async (dimensions: Dimension[]): Promise<ActionPlanItem[]> => {
  const gaps = dimensions
    .map(d => ({ ...d, gap: d.targetScore - d.currentScore }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  // Fallback function for static data with debug info
  const getFallbackData = (errorMsg?: string): ActionPlanItem[] => gaps.map((g, idx) => ({
    id: `plan-${idx}`,
    category: g.name,
    title: errorMsg && idx === 0 ? `调试报错: ${errorMsg.slice(0, 20)}...` : `${g.name}: 差距为 ${g.gap}`,
    priority: idx + 1,
    gap: g.gap,
    status: (g.gap > 5 ? 'critical' : g.gap > 2 ? 'steady' : 'moderate') as 'critical' | 'steady' | 'moderate',
    tasks: errorMsg && idx === 0
      ? [`错误详情: ${errorMsg}`, "请检查 API Key 配置", "请确保已重新部署 (Redeploy)"]
      : [`提升${g.name}的具体方案1`, `提升${g.name}的具体方案2`, `提升${g.name}的具体方案3`],
    imageUrl: "https://picsum.photos/400/200"
  }));

  try {
    const ai = getAiClient();

    if (!ai) {
      console.log("Using fallback data due to missing AI client");
      const keyStatus = process.env.API_KEY ? (process.env.API_KEY === 'undefined' ? 'UNDEFINED_STRING' : 'PRESENT') : 'MISSING';
      return getFallbackData(`CLT_ERR: Key ${keyStatus}`);
    }

    const prompt = `你是一位擅长积极心理学的资深生活教练，善于通过"成长型思维"和"优势视角"来激发用户的潜能。
    
    请根据以下用户的生命维度评分（当前 vs 目标），为差距最大的前三个领域制定具体的年度行动计划。
    
    领域评分:
    ${gaps.map(g => `${g.name}: 当前 ${g.currentScore}, 目标 ${g.targetScore}, 差距 ${g.gap}`).join('\n')}
  
    请返回一个JSON数组，格式如下：
    [
      {
        "category": "领域名称",
        "title": "充满力量的行动标题 (例如: 开启心流体验之旅)",
        "status": "critical | steady | moderate",
        "tasks": ["积极行动1", "积极行动2", "积极行动3"]
      }
    ]
    
    要求：
    1. 每一项必须严格包含 3 个具体的行动方案。
    2. 方案应融合积极心理学概念（如：感恩、心流、优势运用、社会支持）。
    3. 语言要温暖、积极、赋能，避免说教和焦虑贩卖。
    4. 任务应该是微习惯，简单易执行。`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              title: { type: Type.STRING },
              status: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["category", "title", "status", "tasks"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");

    // Map with image placeholders
    const images = [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000"
    ];

    return data.map((item: any, idx: number) => ({
      ...item,
      id: `plan-${idx}`,
      priority: idx + 1,
      gap: gaps[idx].gap,
      imageUrl: images[idx % images.length],
      status: item.status as 'critical' | 'steady' | 'moderate'
    }));
  } catch (error: any) {
    console.error("Gemini Plan Generation Error:", error);
    return getFallbackData(error.message || "Unknown API Error");
  }
};
