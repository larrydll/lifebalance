
import { GoogleGenAI, Type } from "@google/genai";
import { Dimension, ActionPlanItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateActionPlan = async (dimensions: Dimension[]): Promise<ActionPlanItem[]> => {
  const gaps = dimensions
    .map(d => ({ ...d, gap: d.targetScore - d.currentScore }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const prompt = `你是一位专业的生活教练。根据以下生命维度评分（当前 vs 目标），为差距最大的前三个领域制定一个具体的年度行动计划。
  
  领域评分:
  ${gaps.map(g => `${g.name}: 当前 ${g.currentScore}, 目标 ${g.targetScore}, 差距 ${g.gap}`).join('\n')}

  请返回一个JSON数组，格式如下：
  [
    {
      "category": "领域名称",
      "title": "标题 (例如: 精神成长: 差距为 7)",
      "status": "critical | steady | moderate",
      "tasks": ["任务1", "任务2", "任务3"]
    }
  ]
  任务应该是具体、可操作的习惯。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
      imageUrl: images[idx % images.length]
    }));
  } catch (error) {
    console.error("Gemini Plan Generation Error:", error);
    // Fallback static data if AI fails
    return gaps.map((g, idx) => ({
      id: `plan-${idx}`,
      category: g.name,
      title: `${g.name}: 差距为 ${g.gap}`,
      priority: idx + 1,
      gap: g.gap,
      status: g.gap > 5 ? 'critical' : g.gap > 2 ? 'steady' : 'moderate',
      tasks: [`提升${g.name}的具体方案1`, `提升${g.name}的具体方案2`, `提升${g.name}的具体方案3`],
      imageUrl: "https://picsum.photos/400/200"
    }));
  }
};
