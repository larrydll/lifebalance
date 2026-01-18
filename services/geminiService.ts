import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Dimension, ActionPlanItem } from "../types";

// Initialize client lazily to prevent app crash if API key is missing
const getGenAI = () => {
  // Try standard Vite env var first, then fallback to process.env injection
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined') {
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
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
    const genAI = getGenAI();

    if (!genAI) {
      console.log("Using fallback data due to missing AI client");
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
      const keyStatus = apiKey ? (apiKey === 'undefined' ? 'UNDEFINED_STRING' : 'PRESENT') : 'MISSING';
      return getFallbackData(`CLT_ERR: Key ${keyStatus} (Check VITE_GEMINI_API_KEY)`);
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              category: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              status: { type: SchemaType.STRING },
              tasks: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              }
            },
            required: ["category", "title", "status", "tasks"]
          }
        }
      }
    });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const data = JSON.parse(text || "[]");

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
